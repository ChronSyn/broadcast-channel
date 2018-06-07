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
            randomToken: require('random-token')
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
            console.log('Connection acknowledged.');

            stream.on('end', function() {
                console.log('server: end');
            });

            stream.on('data', function(msg) {
                console.log('server: got data:');
                console.dir(msg.toString());
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

    const fileName = time + '_' + readerUuid + '_' + LAZY.randomToken(8) + '.json';

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

export async function create(channelName) {
    lazyRequireInit();
    await ensureFoldersExist(channelName);

    const uuid = LAZY.randomToken(10);

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

    const state = {
        channelName: channelName,
        uuid,
        startTime: new Date().getTime(),
        socketEE,
        otherReaderUuids,
        otherReaderClients,
    };


    return state;
}


export async function postMessage(channelState, messageJson) {

    // ensure we have subscribed to all readers
    const otherReaders = await getReadersUuids(channelState.channelName);
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
    await writeMessage(
        channelState.channelName,
        channelState.uuid,
        messageJson
    );

    // ping other readers
    await Promise.all(
        Object.values(channelState.otherReaderClients)
        .map(client => client.write('new'))
    );

    // emit to own eventEmitter
    channelState.socketEE.emitter.emit('data', JSON.parse(JSON.stringify(messageJson)));
}

// TODO
export async function close(channelState) {}

const NodeMethod = {
    get type() {
        return 'node';
    },
    async create(name) {
        console.log('00');
        ipc.config.id = name;
        ipc.config.retry = 1500;

        console.log('01');
        await ipcServe(ipc);

        console.log('11');

        await new Promise(res => {
            ipc.connectTo(
                name,
                //    PREFIX,
                res
            );
        });
        return {
            id: name,
            ipc
        };
    },
    async postMessage(
        instance,
        msg
    ) {
        instance.ipc.of[instance.id].emit(msg);
    },
    async close(
        instance
    ) {
        instance.ipc.disconnect(instance.id);
    },
    onmessage(
        instance,
        fn
    ) {
        console.dir(instance);
        instance.ipc.of[instance.id].on(
            'message',
            data => {
                console.log('got one data!!');
                ipc.log('got a message from world : '.debug, data);
                fn(data);
            }
        );

        instance.bc.onmessage = fn;
    },
    onmessageerror(
        instance,
        fn
    ) {
        instance.bc.onmessage = fn;
    },
    canBeUsed() {
        return isNode;
    }
};

export default NodeMethod;
