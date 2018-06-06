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

export async function getReadersUuids(channelName) {
    const readersPath = getPaths(channelName).readers;
    const files = await LAZY.readdir(readersPath);
    return files.map(file => file.split('.')[0]);
}

const NodeIpcMethod = {
    get type() {
        return 'node-ipc';
    },
    async create(name) {
        //        const RawIPC = lazyRequire('node-ipc').IPC;
        //        const ipc = new RawIPC;

        const ipc = lazyRequire('node-ipc');
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

export default NodeIpcMethod;
