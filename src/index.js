import {
    isPromise
} from './util.js';

import {
    chooseMethod
} from './method-chooser.js';

import {
    fillOptionsWithDefaults
} from './options.js';


module.exports = (() => {


    const BroadcastChannel = function (name, options) {
        this.name = name;
        this.options = fillOptionsWithDefaults(options);
        this.method = chooseMethod(this.options);

        this._preparePromise = null;
        _prepareChannel(this);
    };

    BroadcastChannel.prototype = {
        postMessage(msg) {
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

            const awaitPrepare = this._preparePromise ? this._preparePromise : Promise.resolve();
            return awaitPrepare.then(() => {
                return this.method.postMessage(
                    this._state,
                    msgObj
                );
            });
        },
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
        },
        close() {
            this.closed = true;
            const awaitPrepare = this._preparePromise ? this._preparePromise : Promise.resolve();
            return awaitPrepare.then(() => {
                return this.method.close(
                    this._state
                );
            });
        },
        get type() {
            return this.method.type;
        }
    };

    function _prepareChannel(channel){
        const maybePromise = channel.method.create(channel.name, channel.options);
        if (isPromise(maybePromise)) {
            channel._preparePromise = maybePromise;
            maybePromise.then(s => {
                // used in tests to simulate slow runtime
                /*if (channel.options.prepareDelay) {
                     await new Promise(res => setTimeout(res, this.options.prepareDelay));
                }*/
                channel._state = s;
            });
        } else {
            channel._state = maybePromise;
        }
    }

    function messageHandler(fn, minTime) {
        return msgObj => {
            if (msgObj.time >= minTime) {
                fn(msgObj.data);
            }
        };
    };


    return BroadcastChannel;

})();