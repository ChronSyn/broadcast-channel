/**
 * this method is used in nodejs-environments.
 * The ipc is handled via sockets and file-writes to the tmp-folder
 */

import isNode from 'detect-node';

let LAZY;
/**
 * modules are loaded async
 * so they will not get bundled when this is used in browsers
 */
const lazyRequireInit = () => {
    if (!LAZY) {
        const util = require('util');
        const fs = require('fs');
        LAZY = {
            os: require('os'),
            events: require('events'),
            net: require('net'),
            fs,
            path: require('path'),
            util,
            mkdir: util.promisify(fs.mkdir),
            writeFile: util.promisify(fs.writeFile),
            readFile: util.promisify(fs.readFile),
            unlink: util.promisify(fs.unlink),
            readdir: util.promisify(fs.readdir),
            randomToken: require('random-token'),
            IdleQueue: require('custom-idle-queue'),
            randomInt: require('random-int')
        };
    }
};

const TMP_FOLDER_NAME = 'pubkey.broadcast-channel';


export function getPaths(channelName) {
    lazyRequireInit();

    const folderPathBase = LAZY.path.join(
        LAZY.os.tmpdir(),
        TMP_FOLDER_NAME
    );
    const channelPathBase = LAZY.path.join(
        LAZY.os.tmpdir(),
        TMP_FOLDER_NAME,
        channelName
    );
    const folderPathReaders = LAZY.path.join(
        channelPathBase,
        'readers'
    );
    const folderPathMessages = LAZY.path.join(
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
    lazyRequireInit();
    const paths = getPaths(channelName);


    await LAZY.mkdir(paths.base).catch(() => null);
    await LAZY.mkdir(paths.channelBase).catch(() => null);
    await Promise.all([
        await LAZY.mkdir(paths.readers).catch(() => null),
        await LAZY.mkdir(paths.messages).catch(() => null)
    ]);
};

export function socketPath(channelName, readerUuid) {
    lazyRequireInit();
    const paths = getPaths(channelName);
    const socketPath = LAZY.path.join(
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

    const emitter = new LAZY.events.EventEmitter();
    const server = LAZY.net
        .createServer(stream => {
            stream.on('end', function() {
                console.log('server: end');
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
        console.log('server: Client connected.');
    });

    return {
        path: pathToSocket,
        emitter,
        server
    };
}

export async function openClientConnection(channelName, readerUuid) {
    const pathToSocket = socketPath(channelName, readerUuid);
    const client = new LAZY.net.Socket();
    await new Promise(res => {
        client.connect(
            pathToSocket,
            () => {
                console.log('client: Connected');
                res();
            }
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

    const fileName = time + '_' + readerUuid + '_' + LAZY.randomToken(12) + '.json';

    const msgPath = LAZY.path.join(
        getPaths(channelName).messages,
        fileName
    );

    await LAZY.writeFile(
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
    const files = await LAZY.readdir(readersPath);
    return files.map(file => file.split('.')[0]);
}

export async function getAllMessages(channelName) {
    const messagesPath = getPaths(channelName).messages;
    const files = await LAZY.readdir(messagesPath);
    return files.map(file => {
        const fileName = file.split('.')[0];
        const split = fileName.split('_');

        return {
            path: LAZY.path.join(
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
    const content = await LAZY.readFile(messageObj.path, 'utf8');
    return JSON.parse(content);
}

/**
 * after this time the messages gets deleted
 * It is assumed that all reader have consumed it by then
 */
const MESSAGE_TTL = 1000 * 60 * 2; // 2 minutes

export async function cleanOldMessages(messageObjects, ttl = MESSAGE_TTL) {
    const olderThen = new Date().getTime() - ttl;

    await Promise.all(
        messageObjects
        .filter(obj => obj.time < olderThen)
        .map(obj => LAZY.unlink(obj.path).catch(() => null))
    );
}



export const type = 'node';

export async function create(channelName, options = {}) {
    lazyRequireInit();
    const startTime = new Date().getTime();

    // set defaults
    if (!options.node) options.node = {};
    if (!options.node.ttl) options.node.ttl = MESSAGE_TTL;

    await ensureFoldersExist(channelName);

    const uuid = LAZY.randomToken(10);
    const messagesEE = new LAZY.events.EventEmitter();

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
    const readQueue = new LAZY.IdleQueue(1);
    const writeQueue = new LAZY.IdleQueue(1);

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
                const r = LAZY.randomInt(0, Object.keys(otherReaderClients).length * 5);
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
    channelState.messagesEE.on('message', msg => {
        console.log('messagesEE.on');
        fn(msg);
    });
}

export async function close(channelState) {
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
}
