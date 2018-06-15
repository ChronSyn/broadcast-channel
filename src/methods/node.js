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
import {
    sha3_224
} from 'js-sha3';

import isNode from 'detect-node';
import randomToken from 'random-token';
import randomInt from 'random-int';
import IdleQueue from 'custom-idle-queue';
import unload from 'unload';

import {
    cleanPipeName
} from '../util';

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
        sha3_224(channelName) // use hash incase of strange characters
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
    return cleanPipeName(socketPath);
}

export function socketInfoPath(channelName, readerUuid) {
    const paths = getPaths(channelName);
    const socketPath = path.join(
        paths.readers,
        readerUuid + '.json'
    );
    return socketPath;
}


/**
 * Because it is not possible to get all socket-files in a folder,
 * when used under fucking windows,
 * we have to set a normal file so other readers know our socket exists
 */
export async function createSocketInfoFile(channelName, readerUuid) {
    await ensureFoldersExist(channelName);
    const pathToFile = socketInfoPath(channelName, readerUuid);
    await writeFile(
        pathToFile,
        JSON.stringify({
            time: new Date().getTime()
        })
    );
    return pathToFile;
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
            stream.on('end', function () {
                // console.log('server: end');
            });

            stream.on('data', function (msg) {
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

    const token = randomToken(12);
    const fileName = time + '_' + readerUuid + '_' + token + '.json';

    const msgPath = path.join(
        getPaths(channelName).messages,
        fileName
    );

    await writeFile(
        msgPath,
        JSON.stringify(writeObject)
    );

    return {
        time,
        uuid: readerUuid,
        token,
        path: msgPath
    }
}

/**
 * returns the uuids of all readers
 * @return {string[]}
 */
export async function getReadersUuids(channelName) {
    const readersPath = getPaths(channelName).readers;
    const files = await readdir(readersPath);

    return files
        .map(file => file.split('.'))
        .filter(split => split[1] === 'json') // do not scan .socket-files
        .map(split => split[0]);
}

export async function messagePath(channelName, time, token, writerUuid) {
    const fileName = time + '_' + writerUuid + '_' + token + '.json';

    const msgPath = path.join(
        getPaths(channelName).messages,
        fileName
    );
    return msgPath;
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
    // set defaults
    if (!options.node) options.node = {};
    if (!options.node.ttl) options.node.ttl = MESSAGE_TTL;

    await ensureFoldersExist(channelName);
    const uuid = randomToken(10);

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

    // ensures we do not read messages in parrallel
    const readQueue = new IdleQueue(1);
    const writeQueue = new IdleQueue(1);

    const state = {
        channelName,
        options,
        uuid,
        socketEE,
        // contains all messages that have been emitted before
        emittedMessagesIds: new Set(),
        messagesCallbackTime: null,
        messagesCallback: null,
        readQueue,
        writeQueue,
        otherReaderUuids,
        otherReaderClients,
        // ensure if process crashes, everything is cleaned up
        removeUnload: unload.add(() => close(state))
    };

    // when new message comes in, we read it and emit it
    socketEE.emitter.on('data', data => {
        console.log('=========');
        console.dir(data);
        handleMessagePing(state)
    });

    return state;
}


/**
 * when the socket pings, so that we now new messages came,
 * run this
 */
export async function handleMessagePing(state) {
    /**
     * if we have 2 or more read-tasks in the queue,
     * we do not have to set more
     */
    if (state.readQueue._idleCalls.size > 1) return;

    /**
     * when there are no listener, we do nothing
     */
    if (!state.messagesCallback) return;

    await state.readQueue.requestIdlePromise();
    await state.readQueue.wrapCall(
        async () => {
            const messages = await getAllMessages(state.channelName);
            const useMessages = messages
                .filter(msgObj => msgObj.senderUuid !== state.uuid) // not send by own
                .filter(msgObj => !state.emittedMessagesIds.has(msgObj.token)) // not already emitted
                .filter(msgObj => msgObj.time >= state.messagesCallbackTime) // not older then onMessageCallback
                .sort((msgObjA, msgObjB) => msgObjA.time - msgObjB.time); // sort by time

            if (state.messagesCallback) {
                for (const msgObj of useMessages) {
                    const content = await readMessage(msgObj);
                    state.emittedMessagesIds.add(msgObj.token);
                    setTimeout(
                        () => state.emittedMessagesIds.delete(msgObj.token),
                        state.options.node.ttl * 2
                    );

                    if (state.messagesCallback) {
                        state.messagesCallback(content.data);
                    }
                }
            }
        }
    );
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
    const msgObj = await channelState.writeQueue.wrapCall(
        () => writeMessage(
            channelState.channelName,
            channelState.uuid,
            messageJson
        )
    );

    // ping other readers
    const pingObj = {
        a: 'msg',
        d: {
            t: msgObj.t,
            u: msgObj.uuid,
            to: msgObj.token
        }
    }
    await Promise.all(
        Object.values(channelState.otherReaderClients)
            .map(client => client.write(JSON.stringify(pingObj)))
    );

    /**
     * clean up old messages
     * to not waste resources on cleaning up,
     * only if random-int matches, we clean up old messages
     */
    if (randomInt(0, 10) === 0) {
        const messages = await getAllMessages(channelState.channelName);
        await cleanOldMessages(messages, channelState.options.node.ttl);
    }

    // emit to own eventEmitter
    channelState.socketEE.emitter.emit('data', JSON.parse(JSON.stringify(messageJson)));
}


export function onMessage(channelState, fn, time = new Date().getTime()) {
    channelState.messagesCallbackTime = time;
    channelState.messagesCallback = fn;
    handleMessagePing(channelState);
}

export function close(channelState) {
    channelState.removeUnload();
    channelState.socketEE.server.close();
    channelState.socketEE.emitter.removeAllListeners();
    channelState.readQueue.clear();
    channelState.writeQueue.clear();
    Object.values(channelState.otherReaderClients)
        .forEach(client => client.destroy());
}


export function canBeUsed() {
    return isNode;
};
