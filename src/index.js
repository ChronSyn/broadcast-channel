import isNode from 'detect-node';

import {
    isPromise
} from './util';

import * as IndexeDbMethod from './methods/indexed-db';
import * as NativeMethod from './methods/native';

// order is important
let METHODS = [
    // NativeMethod, // fastest
    IndexeDbMethod
];

/**
 * The NodeMethod is loaded lazy
 * so it will not get bundled in browser-builds
 */
if (isNode) {
    const NodeMethod = require('./methods/node.js');
    METHODS.push(NodeMethod);
}


class BroadcastChannel {
    constructor(name, options = {}) {
        this.name = name;
        this.options = options;

        if (options.type) {
            this.method = METHODS.find(m => m.type === options.type);
        } else {
            this.method = getFirstUseableMethod();
        }

        this._preparePromise = null;
        this._prepare();
    }
    _prepare() {
        const maybePromise = this.method.create(this.name, this.options);
        if (isPromise(maybePromise)) {
            this._preparePromise = maybePromise;
            maybePromise.then(async (s) => {
                // used in tests to simulate slow runtime
                if (this.options.prepareDelay) {
                    // await new Promise(res => setTimeout(res, this.options.prepareDelay));
                }
                this._state = s;
            });
        } else {
            this._state = maybePromise;
        }
    }
    async postMessage(msg) {
        const msgObj = {
            time: new Date().getTime(),
            data: msg
        };

        if (this.closed) {
            throw new Error(
                'BroadcastChannel.postMessage(): ' +
                'Cannot post message after channel has closed'
            );
        }
        if (this._preparePromise) await this._preparePromise;
        return this.method.postMessage(
            this._state,
            msgObj
        );
    }
    set onmessage(fn) {
        const time = new Date().getTime() - 5;
        if (this._preparePromise) {
            this._preparePromise.then(() => {
                this.method.onMessage(
                    this._state,
                    messageHandler(fn, time),
                    time
                );
            });
        } else {
            this.method.onMessage(
                this._state,
                messageHandler(fn, time),
                time
            );
        }
    }
    async close() {
        this.closed = true;
        if (this._preparePromise) await this._preparePromise;
        await this.method.close(
            this._state
        );
    }
    get type() {
        return this.method.type;
    }
};

function messageHandler(fn, minTime) {
    return msgObj => {
        if (msgObj.time >= minTime) {
            fn(msgObj.data);
        }
    };
}


function getFirstUseableMethod() {
    const useMethod = METHODS.find(method => method.canBeUsed());
    if (!useMethod)
        throw new Error('No useable methode found:' + JSON.stringify(METHODS.map(m => m.type)));
    else
        return useMethod;
}

export default BroadcastChannel;
module.exports = BroadcastChannel;
