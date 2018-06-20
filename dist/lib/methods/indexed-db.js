'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.postMessage = exports.handleMessagePing = exports.create = exports.cleanOldMessages = exports.getOldMessages = exports.removeMessageById = exports.getMessagesHigherThen = exports.getAllMessages = exports.writeMessage = exports.createDatabase = exports.type = undefined;

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var createDatabase = exports.createDatabase = function () {
    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(channelName) {
        var IndexedDB, dbName, openRequest, db;
        return _regenerator2['default'].wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        IndexedDB = getIdb();

                        // create table

                        dbName = DB_PREFIX + channelName;
                        openRequest = IndexedDB.open(dbName, 1);


                        openRequest.onupgradeneeded = function (ev) {
                            var db = ev.target.result;
                            db.createObjectStore(OBJECT_STORE_ID, {
                                keyPath: 'id',
                                autoIncrement: true
                            });
                        };
                        _context.next = 6;
                        return new _promise2['default'](function (res, rej) {
                            openRequest.onerror = function (ev) {
                                return rej(ev);
                            };
                            openRequest.onsuccess = function () {
                                res(openRequest.result);
                            };
                        });

                    case 6:
                        db = _context.sent;
                        return _context.abrupt('return', db);

                    case 8:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function createDatabase(_x) {
        return _ref.apply(this, arguments);
    };
}();
/**
 * writes the new message to the database
 * so other readers can find it
 */


var writeMessage = exports.writeMessage = function () {
    var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(db, readerUuid, messageJson) {
        var time, writeObject, transaction;
        return _regenerator2['default'].wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        time = new Date().getTime();
                        writeObject = {
                            uuid: readerUuid,
                            time: time,
                            data: messageJson
                        };
                        transaction = db.transaction([OBJECT_STORE_ID], 'readwrite');
                        return _context2.abrupt('return', new _promise2['default'](function (res, rej) {
                            transaction.oncomplete = function () {
                                return res();
                            };
                            transaction.onerror = function (ev) {
                                return rej(ev);
                            };

                            var objectStore = transaction.objectStore(OBJECT_STORE_ID);
                            objectStore.add(writeObject);
                        }));

                    case 4:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function writeMessage(_x2, _x3, _x4) {
        return _ref2.apply(this, arguments);
    };
}();

var getAllMessages = exports.getAllMessages = function () {
    var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3(db) {
        var objectStore, ret;
        return _regenerator2['default'].wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
                        ret = [];
                        return _context3.abrupt('return', new _promise2['default'](function (res) {
                            objectStore.openCursor().onsuccess = function (ev) {
                                var cursor = ev.target.result;
                                if (cursor) {
                                    ret.push(cursor.value);
                                    //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
                                    cursor['continue']();
                                } else {
                                    res(ret);
                                }
                            };
                        }));

                    case 3:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function getAllMessages(_x5) {
        return _ref3.apply(this, arguments);
    };
}();

var getMessagesHigherThen = exports.getMessagesHigherThen = function () {
    var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4(db, lastCursorId) {
        var objectStore, ret, keyRangeValue;
        return _regenerator2['default'].wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
                        ret = [];
                        keyRangeValue = IDBKeyRange.bound(lastCursorId + 1, Infinity);
                        return _context4.abrupt('return', new _promise2['default'](function (res) {
                            objectStore.openCursor(keyRangeValue).onsuccess = function (ev) {
                                var cursor = ev.target.result;
                                if (cursor) {
                                    ret.push(cursor.value);
                                    //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
                                    cursor['continue']();
                                } else {
                                    res(ret);
                                }
                            };
                        }));

                    case 4:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this);
    }));

    return function getMessagesHigherThen(_x6, _x7) {
        return _ref4.apply(this, arguments);
    };
}();

var removeMessageById = exports.removeMessageById = function () {
    var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5(db, id) {
        var request;
        return _regenerator2['default'].wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        request = db.transaction([OBJECT_STORE_ID], 'readwrite').objectStore(OBJECT_STORE_ID)['delete'](id);
                        return _context5.abrupt('return', new _promise2['default'](function (res) {
                            request.onsuccess = function () {
                                return res();
                            };
                        }));

                    case 2:
                    case 'end':
                        return _context5.stop();
                }
            }
        }, _callee5, this);
    }));

    return function removeMessageById(_x8, _x9) {
        return _ref5.apply(this, arguments);
    };
}();

var getOldMessages = exports.getOldMessages = function () {
    var _ref6 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee6(db, ttl) {
        var olderThen, objectStore, ret;
        return _regenerator2['default'].wrap(function _callee6$(_context6) {
            while (1) {
                switch (_context6.prev = _context6.next) {
                    case 0:
                        olderThen = new Date().getTime() - ttl;
                        objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
                        ret = [];
                        return _context6.abrupt('return', new _promise2['default'](function (res) {
                            objectStore.openCursor().onsuccess = function (ev) {
                                var cursor = ev.target.result;
                                if (cursor) {
                                    var msgObk = cursor.value;
                                    if (msgObk.time < olderThen) {
                                        ret.push(msgObk);
                                        //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
                                        cursor['continue']();
                                    } else {
                                        // no more old messages,
                                        res(ret);
                                        return;
                                    }
                                } else {
                                    res(ret);
                                }
                            };
                        }));

                    case 4:
                    case 'end':
                        return _context6.stop();
                }
            }
        }, _callee6, this);
    }));

    return function getOldMessages(_x10, _x11) {
        return _ref6.apply(this, arguments);
    };
}();

var cleanOldMessages = exports.cleanOldMessages = function () {
    var _ref7 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee7(db, ttl) {
        var tooOld;
        return _regenerator2['default'].wrap(function _callee7$(_context7) {
            while (1) {
                switch (_context7.prev = _context7.next) {
                    case 0:
                        _context7.next = 2;
                        return getOldMessages(db, ttl);

                    case 2:
                        tooOld = _context7.sent;
                        return _context7.abrupt('return', _promise2['default'].all(tooOld.map(function (msgObj) {
                            return removeMessageById(db, msgObj.id);
                        })));

                    case 4:
                    case 'end':
                        return _context7.stop();
                }
            }
        }, _callee7, this);
    }));

    return function cleanOldMessages(_x12, _x13) {
        return _ref7.apply(this, arguments);
    };
}();

var create = exports.create = function () {
    var _ref8 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee9(channelName) {
        var _this = this;

        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var uuid, readQueue, db, state;
        return _regenerator2['default'].wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        options = (0, _options.fillOptionsWithDefaults)(options);

                        uuid = (0, _randomToken2['default'])(10);

                        // ensures we do not read messages in parrallel

                        readQueue = new _customIdleQueue2['default'](1);
                        _context9.next = 5;
                        return createDatabase(channelName);

                    case 5:
                        db = _context9.sent;
                        state = {
                            closed: false,
                            lastCursorId: 0,
                            channelName: channelName,
                            options: options,
                            uuid: uuid,
                            // contains all messages that have been emitted before
                            emittedMessagesIds: new _set2['default'](),
                            messagesCallback: null,
                            readQueue: readQueue,
                            db: db
                        };

                        /**
                         * if service-workers are used,
                         * we have no 'storage'-event if they post a message,
                         * therefore we also have to set an interval
                         */

                        (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee8() {
                            return _regenerator2['default'].wrap(function _callee8$(_context8) {
                                while (1) {
                                    switch (_context8.prev = _context8.next) {
                                        case 0:
                                            if (!(state.closed === false)) {
                                                _context8.next = 7;
                                                break;
                                            }

                                            _context8.next = 3;
                                            return handleMessagePing(state);

                                        case 3:
                                            _context8.next = 5;
                                            return new _promise2['default'](function (res) {
                                                return setTimeout(res, state.options.idb.fallbackInterval);
                                            });

                                        case 5:
                                            _context8.next = 0;
                                            break;

                                        case 7:
                                        case 'end':
                                            return _context8.stop();
                                    }
                                }
                            }, _callee8, _this);
                        }))();

                        return _context9.abrupt('return', state);

                    case 9:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function create(_x15) {
        return _ref8.apply(this, arguments);
    };
}();

/**
 * when the storage-event pings, so that we now new messages came,
 * run this
 */


var handleMessagePing = exports.handleMessagePing = function () {
    var _ref10 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee11(state) {
        var _this2 = this;

        return _regenerator2['default'].wrap(function _callee11$(_context11) {
            while (1) {
                switch (_context11.prev = _context11.next) {
                    case 0:
                        if (state.messagesCallback) {
                            _context11.next = 2;
                            break;
                        }

                        return _context11.abrupt('return');

                    case 2:
                        if (!(state.readQueue._idleCalls.size > 1)) {
                            _context11.next = 4;
                            break;
                        }

                        return _context11.abrupt('return');

                    case 4:
                        _context11.next = 6;
                        return state.readQueue.requestIdlePromise();

                    case 6:
                        _context11.next = 8;
                        return state.readQueue.wrapCall((0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee10() {
                            var newerMessages, useMessages, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _loop, _iterator, _step;

                            return _regenerator2['default'].wrap(function _callee10$(_context10) {
                                while (1) {
                                    switch (_context10.prev = _context10.next) {
                                        case 0:
                                            _context10.next = 2;
                                            return getMessagesHigherThen(state.db, state.lastCursorId);

                                        case 2:
                                            newerMessages = _context10.sent;
                                            useMessages = newerMessages.map(function (msgObj) {
                                                if (msgObj.id > state.lastCursorId) {
                                                    state.lastCursorId = msgObj.id;
                                                }
                                                return msgObj;
                                            }).filter(function (msgObj) {
                                                return msgObj.uuid !== state.uuid;
                                            }) // not send by own
                                            .filter(function (msgObj) {
                                                return !state.emittedMessagesIds.has(msgObj.id);
                                            }) // not already emitted
                                            .filter(function (msgObj) {
                                                return msgObj.time >= state.messagesCallbackTime;
                                            }) // not older then onMessageCallback
                                            .sort(function (msgObjA, msgObjB) {
                                                return msgObjA.time - msgObjB.time;
                                            }); // sort by time

                                            _iteratorNormalCompletion = true;
                                            _didIteratorError = false;
                                            _iteratorError = undefined;
                                            _context10.prev = 7;

                                            _loop = function _loop() {
                                                var msgObj = _step.value;

                                                if (state.messagesCallback) {
                                                    state.emittedMessagesIds.add(msgObj.id);
                                                    setTimeout(function () {
                                                        return state.emittedMessagesIds['delete'](msgObj.id);
                                                    }, state.options.idb.ttl * 2);

                                                    state.messagesCallback(msgObj.data);
                                                }
                                            };

                                            for (_iterator = (0, _getIterator3['default'])(useMessages); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                                _loop();
                                            }
                                            _context10.next = 16;
                                            break;

                                        case 12:
                                            _context10.prev = 12;
                                            _context10.t0 = _context10['catch'](7);
                                            _didIteratorError = true;
                                            _iteratorError = _context10.t0;

                                        case 16:
                                            _context10.prev = 16;
                                            _context10.prev = 17;

                                            if (!_iteratorNormalCompletion && _iterator['return']) {
                                                _iterator['return']();
                                            }

                                        case 19:
                                            _context10.prev = 19;

                                            if (!_didIteratorError) {
                                                _context10.next = 22;
                                                break;
                                            }

                                            throw _iteratorError;

                                        case 22:
                                            return _context10.finish(19);

                                        case 23:
                                            return _context10.finish(16);

                                        case 24:
                                        case 'end':
                                            return _context10.stop();
                                    }
                                }
                            }, _callee10, _this2, [[7, 12, 16, 24], [17,, 19, 23]]);
                        })));

                    case 8:
                    case 'end':
                        return _context11.stop();
                }
            }
        }, _callee11, this);
    }));

    return function handleMessagePing(_x16) {
        return _ref10.apply(this, arguments);
    };
}();

var postMessage = exports.postMessage = function () {
    var _ref12 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee12(channelState, messageJson) {
        return _regenerator2['default'].wrap(function _callee12$(_context12) {
            while (1) {
                switch (_context12.prev = _context12.next) {
                    case 0:
                        _context12.next = 2;
                        return writeMessage(channelState.db, channelState.uuid, messageJson);

                    case 2:

                        if ((0, _randomInt2['default'])(0, 10) === 0) {
                            /* await (do not await) */cleanOldMessages(channelState.db, channelState.options.idb.ttl);
                        }

                    case 3:
                    case 'end':
                        return _context12.stop();
                }
            }
        }, _callee12, this);
    }));

    return function postMessage(_x17, _x18) {
        return _ref12.apply(this, arguments);
    };
}();

exports.getIdb = getIdb;
exports.close = close;
exports.onMessage = onMessage;
exports.canBeUsed = canBeUsed;

var _detectNode = require('detect-node');

var _detectNode2 = _interopRequireDefault(_detectNode);

var _randomToken = require('random-token');

var _randomToken2 = _interopRequireDefault(_randomToken);

var _randomInt = require('random-int');

var _randomInt2 = _interopRequireDefault(_randomInt);

var _customIdleQueue = require('custom-idle-queue');

var _customIdleQueue2 = _interopRequireDefault(_customIdleQueue);

var _options = require('../options');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var DB_PREFIX = 'pubkey.broadcast-channel-0-'; /**
                                                * this method uses indexeddb to store the messages
                                                * There is currently no observerAPI for idb
                                                * @link https://github.com/w3c/IndexedDB/issues/51
                                                * So we use the localstorage 'storage'-event
                                                * to ping other tabs when a message comes in
                                                */

var OBJECT_STORE_ID = 'messages';

var type = exports.type = 'idb';

function getIdb() {
    if (typeof indexedDB !== 'undefined') return indexedDB;
    if (typeof mozIndexedDB !== 'undefined') return mozIndexedDB;
    if (typeof webkitIndexedDB !== 'undefined') return webkitIndexedDB;
    if (typeof msIndexedDB !== 'undefined') return msIndexedDB;

    return false;
}

function close(channelState) {
    channelState.closed = true;
    channelState.readQueue.clear();
    channelState.db.close();
}

function onMessage(channelState, fn, time) {
    channelState.messagesCallbackTime = time;
    channelState.messagesCallback = fn;
    handleMessagePing(channelState);
}

function canBeUsed() {
    if (_detectNode2['default']) return false;
    var idb = getIdb();

    if (!idb) return false;
    return true;
};