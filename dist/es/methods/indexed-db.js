import _getIterator from 'babel-runtime/core-js/get-iterator';
import _Set from 'babel-runtime/core-js/set';
import _regeneratorRuntime from 'babel-runtime/regenerator';
import _Promise from 'babel-runtime/core-js/promise';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
/**
 * this method uses indexeddb to store the messages
 * There is currently no observerAPI for idb
 * @link https://github.com/w3c/IndexedDB/issues/51
 * So we use the localstorage 'storage'-event
 * to ping other tabs when a message comes in
 */

import isNode from 'detect-node';
import randomToken from 'random-token';
import randomInt from 'random-int';
import IdleQueue from 'custom-idle-queue';

import { fillOptionsWithDefaults } from '../options';

var DB_PREFIX = 'pubkey.broadcast-channel-0-';
var OBJECT_STORE_ID = 'messages';

export var type = 'idb';

export function getIdb() {
    if (typeof indexedDB !== 'undefined') return indexedDB;
    if (typeof mozIndexedDB !== 'undefined') return mozIndexedDB;
    if (typeof webkitIndexedDB !== 'undefined') return webkitIndexedDB;
    if (typeof msIndexedDB !== 'undefined') return msIndexedDB;

    return false;
}

export var createDatabase = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(channelName) {
        var IndexedDB, dbName, openRequest, db;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
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
                        return new _Promise(function (res, rej) {
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
export var writeMessage = function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(db, readerUuid, messageJson) {
        var time, writeObject, transaction;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
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
                        return _context2.abrupt('return', new _Promise(function (res, rej) {
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

export var getAllMessages = function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(db) {
        var objectStore, ret;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
                        ret = [];
                        return _context3.abrupt('return', new _Promise(function (res) {
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

export var getMessagesHigherThen = function () {
    var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(db, lastCursorId) {
        var objectStore, ret, keyRangeValue;
        return _regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
                        ret = [];
                        keyRangeValue = IDBKeyRange.bound(lastCursorId + 1, Infinity);
                        return _context4.abrupt('return', new _Promise(function (res) {
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

export var removeMessageById = function () {
    var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(db, id) {
        var request;
        return _regeneratorRuntime.wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        request = db.transaction([OBJECT_STORE_ID], 'readwrite').objectStore(OBJECT_STORE_ID)['delete'](id);
                        return _context5.abrupt('return', new _Promise(function (res) {
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

export var getOldMessages = function () {
    var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(db, ttl) {
        var olderThen, objectStore, ret;
        return _regeneratorRuntime.wrap(function _callee6$(_context6) {
            while (1) {
                switch (_context6.prev = _context6.next) {
                    case 0:
                        olderThen = new Date().getTime() - ttl;
                        objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
                        ret = [];
                        return _context6.abrupt('return', new _Promise(function (res) {
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

export var cleanOldMessages = function () {
    var _ref7 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(db, ttl) {
        var tooOld;
        return _regeneratorRuntime.wrap(function _callee7$(_context7) {
            while (1) {
                switch (_context7.prev = _context7.next) {
                    case 0:
                        _context7.next = 2;
                        return getOldMessages(db, ttl);

                    case 2:
                        tooOld = _context7.sent;
                        return _context7.abrupt('return', _Promise.all(tooOld.map(function (msgObj) {
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

export var create = function () {
    var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(channelName) {
        var _this = this;

        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var uuid, readQueue, db, state;
        return _regeneratorRuntime.wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        options = fillOptionsWithDefaults(options);

                        uuid = randomToken(10);

                        // ensures we do not read messages in parrallel

                        readQueue = new IdleQueue(1);
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
                            emittedMessagesIds: new _Set(),
                            messagesCallback: null,
                            readQueue: readQueue,
                            db: db
                        };

                        /**
                         * if service-workers are used,
                         * we have no 'storage'-event if they post a message,
                         * therefore we also have to set an interval
                         */

                        _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8() {
                            return _regeneratorRuntime.wrap(function _callee8$(_context8) {
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
                                            return new _Promise(function (res) {
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

    return function create(_x14) {
        return _ref8.apply(this, arguments);
    };
}();

/**
 * when the storage-event pings, so that we now new messages came,
 * run this
 */
export var handleMessagePing = function () {
    var _ref10 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee11(state) {
        var _this2 = this;

        return _regeneratorRuntime.wrap(function _callee11$(_context11) {
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
                        return state.readQueue.wrapCall(_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee10() {
                            var newerMessages, useMessages, _loop, _iterator, _isArray, _i, _ref12, _ret;

                            return _regeneratorRuntime.wrap(function _callee10$(_context10) {
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

                                            _loop = function _loop() {
                                                if (_isArray) {
                                                    if (_i >= _iterator.length) return 'break';
                                                    _ref12 = _iterator[_i++];
                                                } else {
                                                    _i = _iterator.next();
                                                    if (_i.done) return 'break';
                                                    _ref12 = _i.value;
                                                }

                                                var msgObj = _ref12;

                                                if (state.messagesCallback) {
                                                    state.emittedMessagesIds.add(msgObj.id);
                                                    setTimeout(function () {
                                                        return state.emittedMessagesIds['delete'](msgObj.id);
                                                    }, state.options.idb.ttl * 2);

                                                    state.messagesCallback(msgObj.data);
                                                }
                                            };

                                            _iterator = useMessages, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _getIterator(_iterator);

                                        case 6:
                                            _ret = _loop();

                                            if (!(_ret === 'break')) {
                                                _context10.next = 9;
                                                break;
                                            }

                                            return _context10.abrupt('break', 11);

                                        case 9:
                                            _context10.next = 6;
                                            break;

                                        case 11:
                                        case 'end':
                                            return _context10.stop();
                                    }
                                }
                            }, _callee10, _this2);
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

export function close(channelState) {
    channelState.closed = true;
    channelState.readQueue.clear();
    channelState.db.close();
}

export var postMessage = function () {
    var _ref13 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee12(channelState, messageJson) {
        return _regeneratorRuntime.wrap(function _callee12$(_context12) {
            while (1) {
                switch (_context12.prev = _context12.next) {
                    case 0:
                        _context12.next = 2;
                        return writeMessage(channelState.db, channelState.uuid, messageJson);

                    case 2:

                        if (randomInt(0, 10) === 0) {
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
        return _ref13.apply(this, arguments);
    };
}();

export function onMessage(channelState, fn, time) {
    channelState.messagesCallbackTime = time;
    channelState.messagesCallback = fn;
    handleMessagePing(channelState);
}

export function canBeUsed() {
    if (isNode) return false;
    var idb = getIdb();

    if (!idb) return false;
    return true;
};