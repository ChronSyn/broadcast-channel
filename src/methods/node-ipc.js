/**
 * this method is used in nodejs-environments.
 * It basically uses node-ipc
 * @link https://www.npmjs.com/package/node-ipc
 */

import isNode from 'detect-node';

/**
 * modules are loaded async
 * so they will not get bundled when this is used in browsers
 */
const lazyRequire = mod => {
    const modules = {
        'node-ipc': require('node-ipc')
    };
    return modules[mod];
};

// incase other modules used node-ipc, we prefix everything
const PREFIX = 'pubkey.broadcast-channel';

const NodeIpcMethod = {
    get type() {
        return 'node-ipc';
    },
    async create(name) {
        const RawIPC = lazyRequire('node-ipc').IPC;
        const ipc = new RawIPC;

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
