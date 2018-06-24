'use strict';

var _util = require('./util.js');

var _methodChooser = require('./method-chooser.js');

var _options = require('./options.js');

module.exports = function () {

    var BroadcastChannel = function BroadcastChannel(name, options) {
        this.name = name;
        this.options = (0, _options.fillOptionsWithDefaults)(options);
        this.method = (0, _methodChooser.chooseMethod)(this.options);

        this._preparePromise = null;
        _prepareChannel(this);
    };

    BroadcastChannel.prototype = {
        postMessage: function postMessage(msg) {
            var _this = this;

            var msgObj = {
                time: new Date().getTime(),
                data: msg
            };

            if (this.closed) {
                throw new Error('BroadcastChannel.postMessage(): ' + 'Cannot post message after channel has closed');
            }

            var awaitPrepare = this._preparePromise ? this._preparePromise : Promise.resolve();
            return awaitPrepare.then(function () {
                return _this.method.postMessage(_this._state, msgObj);
            });
        },

        set onmessage(fn) {
            var _this2 = this;

            var time = new Date().getTime() - 5;
            if (this._preparePromise) {
                this._preparePromise.then(function () {
                    _this2.method.onMessage(_this2._state, messageHandler(fn, time), time);
                });
            } else {
                this.method.onMessage(this._state, messageHandler(fn, time), time);
            }
        },
        close: function close() {
            var _this3 = this;

            this.closed = true;
            var awaitPrepare = this._preparePromise ? this._preparePromise : Promise.resolve();
            return awaitPrepare.then(function () {
                return _this3.method.close(_this3._state);
            });
        },

        get type() {
            return this.method.type;
        }
    };

    function _prepareChannel(channel) {
        var maybePromise = channel.method.create(channel.name, channel.options);
        if ((0, _util.isPromise)(maybePromise)) {
            channel._preparePromise = maybePromise;
            maybePromise.then(function (s) {
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
        return function (msgObj) {
            if (msgObj.time >= minTime) {
                fn(msgObj.data);
            }
        };
    };

    return BroadcastChannel;
}();