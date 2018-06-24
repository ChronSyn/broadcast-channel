'use strict';

var _util = require('./util.js');

var _methodChooser = require('./method-chooser.js');

var _options = require('./options.js');

module.exports = function () {

    var BroadcastChannel = function BroadcastChannel(name) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        this.name = name;
        this.options = (0, _options.fillOptionsWithDefaults)(options);
        this.method = (0, _methodChooser.chooseMethod)(this.options);

        this._preparePromise = null;
        this._prepare();
    };

    BroadcastChannel.prototype = {
        _prepare: function _prepare() {
            var _this = this;

            var maybePromise = this.method.create(this.name, this.options);
            if ((0, _util.isPromise)(maybePromise)) {
                this._preparePromise = maybePromise;
                maybePromise.then(function (s) {
                    // used in tests to simulate slow runtime
                    if (_this.options.prepareDelay) {
                        // await new Promise(res => setTimeout(res, this.options.prepareDelay));
                    }
                    _this._state = s;
                });
            } else {
                this._state = maybePromise;
            }
        },
        postMessage: function postMessage(msg) {
            var _this2 = this;

            var msgObj = {
                time: new Date().getTime(),
                data: msg
            };

            if (this.closed) {
                throw new Error('BroadcastChannel.postMessage(): ' + 'Cannot post message after channel has closed');
            }

            var awaitPrepare = this._preparePromise ? this._preparePromise : Promise.resolve();
            return awaitPrepare.then(function () {
                return _this2.method.postMessage(_this2._state, msgObj);
            });
        },

        set onmessage(fn) {
            var _this3 = this;

            var time = new Date().getTime() - 5;
            if (this._preparePromise) {
                this._preparePromise.then(function () {
                    _this3.method.onMessage(_this3._state, messageHandler(fn, time), time);
                });
            } else {
                this.method.onMessage(this._state, messageHandler(fn, time), time);
            }
        },
        close: function close() {
            var _this4 = this;

            this.closed = true;
            var awaitPrepare = this._preparePromise ? this._preparePromise : Promise.resolve();
            return awaitPrepare.then(function () {
                return _this4.method.close(_this4._state);
            });
        },

        get type() {
            return this.method.type;
        }
    };

    function messageHandler(fn, minTime) {
        return function (msgObj) {
            if (msgObj.time >= minTime) {
                fn(msgObj.data);
            }
        };
    };

    return BroadcastChannel;
}();