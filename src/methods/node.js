/**
 * this method is used in nodejs-environments.
 * The ipc is handled via sockets and file-writes to the tmp-folder
 */

import * as util from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as events from 'events';
import * as net from 'net';
import * as path from 'path';

import isNode from 'detect-node';
import randomToken from 'random-token';
import randomInt from 'random-int';
import IdleQueue from 'custom-idle-queue';
import unload from 'unload';

const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);
const readdir = util.promisify(fs.readdir);


const TMP_FOLDER_NAME = 'pubkey.broadcast-channel';
/**
 * after this time the messages gets deleted
 * It is assumed that all reader have consumed it by then
 */
const MESSAGE_TTL = 1000 * 60 * 2; // 2 minutes

export function getPaths(channelName) {

    const folderPathBase = path.join(
        os.tmpdir(),
        TMP_FOLDER_NAME
    );
    const channelPathBase = path.join(
        os.tmpdir(),
        TMP_FOLDER_NAME,
        channelName
    );
    const folderPathReaders = path.join(
        channelPathBase,
        'readers'
    );
    const folderPathMessages = path.join(
        channelPathBase,
        'messages'
    );

    return {
        base: folderPathBase,
        channelBase: channelPathBase,
        readers: folderPathReaders,
        messages: folderPathMessages
    };
}

export async function ensureFoldersExist(channelName) {

    const paths = getPaths(channelName);


    await mkdir(paths.base).catch(() => null);
    await mkdir(paths.channelBase).catch(() => null);
    await Promise.all([
        await mkdir(paths.readers).catch(() => null),
        await mkdir(paths.messages).catch(() => null)
    ]);
};

export function socketPath(channelName, readerUuid) {

    const paths = getPaths(channelName);
    const socketPath = path.join(
        paths.readers,
        readerUuid + '.sock'
    );
    return socketPath;
}

/**
 * creates the socket-file and subscribes to it
 * @return {{emitter: EventEmitter, server: any}}
 */
export async function createSocketEventEmitter(channelName, readerUuid) {
    const pathToSocket = socketPath(channelName, readerUuid);

    const emitter = new events.EventEmitter();
    const server = net
        .createServer(stream => {
            stream.on('end', function() {
                // console.log('server: end');
            });

            stream.on('data', function(msg) {
                // console.log('server: got data:');
                // console.dir(msg.toString());
                emitter.emit('data', msg.toString());
            });
        });

    await new Promise(res => {
        server.listen(pathToSocket, () => {
            res();
        });
    });
    server.on('connection', () => {
        // console.log('server: Client connected.');
    });

    return {
        path: pathToSocket,
        emitter,
        server
    };
}

export async function openClientConnection(channelName, readerUuid) {
    const pathToSocket = socketPath(channelName, readerUuid);
    const client = new net.Socket();
    await new Promise(res => {
        client.connect(
            pathToSocket,
            res
        );
    });
    return client;
}


/**
 * writes the new message to the file-system
 * so other readers can find it
 */
export async function writeMessage(channelName, readerUuid, messageJson) {
    const time = new Date().getTime();
    const writeObject = {
        uuid: readerUuid,
        time,
        data: messageJson
    };

    const fileName = time + '_' + readerUuid + '_' + randomToken(12) + '.json';

    const msgPath = path.join(
        getPaths(channelName).messages,
        fileName
    );

    await writeFile(
        msgPath,
        JSON.stringify(writeObject)
    );

    return msgPath;
}

/**
 * returns the uuids of all readers
 * @return {string[]}
 */
export async function getReadersUuids(channelName) {
    const readersPath = getPaths(channelName).readers;
    const files = await readdir(readersPath);
    return files.map(file => file.split('.')[0]);
}

export async function getAllMessages(channelName) {
    const messagesPath = getPaths(channelName).messages;
    const files = await readdir(messagesPath);
    return files.map(file => {
        const fileName = file.split('.')[0];
        const split = fileName.split('_');

        return {
            path: path.join(
                messagesPath,
                file
            ),
            time: parseInt(split[0]),
            senderUuid: split[1],
            token: split[2]
        };
    });
}

export async function readMessage(messageObj) {
    const content = await readFile(messageObj.path, 'utf8');
    return JSON.parse(content);
}

export async function cleanOldMessages(messageObjects, ttl = MESSAGE_TTL) {
    const olderThen = new Date().getTime() - ttl;

    await Promise.all(
        messageObjects
        .filter(obj => obj.time < olderThen)
        .map(obj => unlink(obj.path).catch(() => null))
    );
}



export const type = 'node';

export async function create(channelName, options = {}) {

    const startTime = new Date().getTime();

    // set defaults
    if (!options.node) options.node = {};
    if (!options.node.ttl) options.node.ttl = MESSAGE_TTL;

    await ensureFoldersExist(channelName);

    const uuid = randomToken(10);
    const messagesEE = new events.EventEmitter();

    const [
        otherReaderUuids,
        socketEE
    ] = await Promise.all([
        getReadersUuids(channelName),
        createSocketEventEmitter(channelName, uuid)
    ]);

    const otherReaderClients = {};
    await Promise.all(
        otherReaderUuids
        .filter(readerUuid => readerUuid !== uuid) // not own
        .map(async (readerUuid) => {
            const client = await openClientConnection(channelName, readerUuid);
            otherReaderClients[readerUuid] = client;
        })
    );

    // contains all messages that have been emitted before
    const emittedMessagesIds = new Set();

    // ensures we do not read messages in parrallel
    const readQueue = new IdleQueue(1);
    const writeQueue = new IdleQueue(1);

    // when new message comes in, we read it and emit it
    socketEE.emitter.on('data', async () => {

        /**
         * if we have 2 or more read-tasks in the queue,
         * we do not have to set more
         */
        if (readQueue._idleCalls.size > 1) return;

        await readQueue.requestIdlePromise();
        await readQueue.wrapCall(
            async () => {
                const messages = await getAllMessages(channelName);
                const nonEmitted = messages.filter(msgObj => !emittedMessagesIds.has(msgObj.token));
                const notTooOld = nonEmitted.filter(msgObj => msgObj.time > startTime);
                const timeSorted = notTooOld.sort((msgObjA, msgObjB) => msgObjA.time - msgObjB.time);

                for (const msgObj of timeSorted) {
                    const content = await readMessage(msgObj);
                    emittedMessagesIds.add(msgObj.token);
                    setTimeout(() => emittedMessagesIds.delete(msgObj.token), options.node.ttl * 2);

                    messagesEE.emit('message', content.data);
                }

                /**
                 * to not waste resources on cleaning up,
                 * only if random-int matches, we clean up old messages
                 */
                const r = randomInt(0, Object.keys(otherReaderClients).length * 5);
                if (r === 0)
                    await cleanOldMessages(messages, options.node.ttl);
            }
        );
    });


    const state = {
        channelName,
        options,
        uuid,
        startTime,
        socketEE,
        messagesEE,
        readQueue,
        writeQueue,
        otherReaderUuids,
        otherReaderClients,
        // ensure if process crashes, everything is cleaned up
        removeUnload: unload.add(() => close(state))
    };

    return state;
}


export async function postMessage(channelState, messageJson) {

    // ensure we have subscribed to all readers
    const otherReaders = await getReadersUuids(channelState.channelName);

    // remove subscriptions to closed readers
    Object.keys(channelState.otherReaderClients)
        .filter(readerUuid => !otherReaders.includes(readerUuid))
        .forEach(readerUuid => {
            channelState.otherReaderClients[readerUuid].close();
            delete channelState.otherReaderClients[readerUuid];
        });

    await Promise.all(
        otherReaders
        .filter(readerUuid => readerUuid !== channelState.uuid) // not own
        .filter(readerUuid => !channelState.otherReaderClients[readerUuid]) // not already has client
        .map(async (readerUuid) => {
            const client = await openClientConnection(channelState.channelName, readerUuid);
            channelState.otherReaderClients[readerUuid] = client;
        })
    );

    // write message to fs
    await channelState.writeQueue.requestIdlePromise();
    await channelState.writeQueue.wrapCall(
        () => writeMessage(
            channelState.channelName,
            channelState.uuid,
            messageJson
        )
    );

    // ping other readers
    await Promise.all(
        Object.values(channelState.otherReaderClients)
        .map(client => client.write('new'))
    );

    // emit to own eventEmitter
    channelState.socketEE.emitter.emit('data', JSON.parse(JSON.stringify(messageJson)));
}


export function onMessage(channelState, fn) {
    channelState.messagesEE.on('message', msg => fn(msg));
}

export function close(channelState) {
    channelState.removeUnload();
    channelState.socketEE.server.close();
    channelState.socketEE.emitter.removeAllListeners();
    channelState.messagesEE.removeAllListeners();
    channelState.readQueue.clear();
    channelState.writeQueue.clear();
    Object.values(channelState.otherReaderClients)
        .forEach(client => client.destroy());
}


export function canBeUsed() {
    return isNode;
};
