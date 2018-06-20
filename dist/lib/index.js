'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _util = require('./util.js');

var _methodChooser = require('./method-chooser.js');

var _options = require('./options.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var BroadcastChannel = function () {
    function BroadcastChannel(name) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        (0, _classCallCheck3['default'])(this, BroadcastChannel);

        this.name = name;
        this.options = (0, _options.fillOptionsWithDefaults)(options);
        this.method = (0, _methodChooser.chooseMethod)(this.options);

        this._preparePromise = null;
        this._prepare();
    }

    (0, _createClass3['default'])(BroadcastChannel, [{
        key: '_prepare',
        value: function _prepare() {
            var _this = this;

            var maybePromise = this.method.create(this.name, this.options);
            if ((0, _util.isPromise)(maybePromise)) {
                this._preparePromise = maybePromise;
                maybePromise.then(function () {
                    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(s) {
                        return _regenerator2['default'].wrap(function _callee$(_context) {
                            while (1) {
                                switch (_context.prev = _context.next) {
                                    case 0:
                                        // used in tests to simulate slow runtime
                                        if (_this.options.prepareDelay) {
                                            // await new Promise(res => setTimeout(res, this.options.prepareDelay));
                                        }
                                        _this._state = s;

                                    case 2:
                                    case 'end':
                                        return _context.stop();
                                }
                            }
                        }, _callee, _this);
                    }));

                    return function (_x2) {
                        return _ref.apply(this, arguments);
                    };
                }());
            } else {
                this._state = maybePromise;
            }
        }
    }, {
        key: 'postMessage',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(msg) {
                var msgObj;
                return _regenerator2['default'].wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                msgObj = {
                                    time: new Date().getTime(),
                                    data: msg
                                };

                                if (!this.closed) {
                                    _context2.next = 3;
                                    break;
                                }

                                throw new Error('BroadcastChannel.postMessage(): ' + 'Cannot post message after channel has closed');

                            case 3:
                                if (!this._preparePromise) {
                                    _context2.next = 6;
                                    break;
                                }

                                _context2.next = 6;
                                return this._preparePromise;

                            case 6:
                                return _context2.abrupt('return', this.method.postMessage(this._state, msgObj));

                            case 7:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function postMessage(_x3) {
                return _ref2.apply(this, arguments);
            }

            return postMessage;
        }()
    }, {
        key: 'close',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3() {
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                this.closed = true;

                                if (!this._preparePromise) {
                                    _context3.next = 4;
                                    break;
                                }

                                _context3.next = 4;
                                return this._preparePromise;

                            case 4:
                                _context3.next = 6;
                                return this.method.close(this._state);

                            case 6:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function close() {
                return _ref3.apply(this, arguments);
            }

            return close;
        }()
    }, {
        key: 'onmessage',
        set: function set(fn) {
            var _this2 = this;

            var time = new Date().getTime() - 5;
            if (this._preparePromise) {
                this._preparePromise.then(function () {
                    _this2.method.onMessage(_this2._state, messageHandler(fn, time), time);
                });
            } else {
                this.method.onMessage(this._state, messageHandler(fn, time), time);
            }
        }
    }, {
        key: 'type',
        get: function get() {
            return this.method.type;
        }
    }]);
    return BroadcastChannel;
}();

;

function messageHandler(fn, minTime) {
    return function (msgObj) {
        if (msgObj.time >= minTime) {
            fn(msgObj.data);
        }
    };
}

exports['default'] = BroadcastChannel;

module.exports = BroadcastChannel;