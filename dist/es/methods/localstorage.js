import _Set from 'babel-runtime/core-js/set';
import _regeneratorRuntime from 'babel-runtime/regenerator';
import _JSON$stringify from 'babel-runtime/core-js/json/stringify';
import _Promise from 'babel-runtime/core-js/promise';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
/**
 * A localStorage-only method which uses localstorage and its 'storage'-event
 * This does not work inside of webworkers because they have no access to locastorage
 * This is basically implemented to support IE9 or your grandmothers toaster.
 * @link https://caniuse.com/#feat=namevalue-storage
 * @link https://caniuse.com/#feat=indexeddb
 */

import isNode from 'detect-node';
import randomToken from 'random-token';
import IdleQueue from 'custom-idle-queue';

import { fillOptionsWithDefaults } from '../options';

var KEY_PREFIX = 'pubkey.broadcastChannel-';
export var type = 'localstorage';

/**
 * copied from crosstab
 * @link https://github.com/tejacques/crosstab/blob/master/src/crosstab.js#L32
 */
export function getLocalStorage() {
    var localStorage = void 0;
    if (typeof window === 'undefined') return null;
    try {
        localStorage = window.localStorage;
        localStorage = window['ie8-eventlistener/storage'] || window.localStorage;
    } catch (e) {
        // New versions of Firefox throw a Security exception
        // if cookies are disabled. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1028153
    }
    return localStorage;
}

export function storageKey(channelName) {
    return KEY_PREFIX + channelName;
}

/**
* writes the new message to the storage
* and fires the storage-event so other readers can find it
*/
export var postMessage = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(channelState, messageJson) {
        var key, writeObj, value, ev;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return new _Promise(function (res) {
                            return setTimeout(res, 0);
                        });

                    case 2:
                        key = storageKey(channelState.channelName);
                        writeObj = {
                            token: randomToken(10),
                            time: new Date().getTime(),
                            data: messageJson,
                            uuid: channelState.uuid
                        };
                        value = _JSON$stringify(writeObj);

                        localStorage.setItem(key, value);

                        /**
                         * StorageEvent does not fire the 'storage' event
                         * in the window that changes the state of the local storage.
                         * So we fire it manually
                         */
                        ev = document.createEvent('Event');

                        ev.initEvent('storage', true, true);
                        ev.key = key;
                        ev.newValue = value;
                        window.dispatchEvent(ev);

                    case 11:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function postMessage(_x, _x2) {
        return _ref.apply(this, arguments);
    };
}();

export function addStorageEventListener(channelName, fn) {
    var key = storageKey(channelName);
    var listener = function listener(ev) {
        if (ev.key === key) {
            fn(JSON.parse(ev.newValue));
        }
    };
    window.addEventListener('storage', listener);
    return listener;
}
export function removeStorageEventListener(listener) {
    window.removeEventListener('storage', listener);
}

export function create(channelName) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    options = fillOptionsWithDefaults(options);
    if (!canBeUsed()) {
        throw new Error('BroadcastChannel: localstorage cannot be used');
    }

    var startTime = new Date().getTime();
    var uuid = randomToken(10);

    // contains all messages that have been emitted before
    var emittedMessagesIds = new _Set();

    var writeQueue = new IdleQueue(1);

    var state = {
        startTime: startTime,
        channelName: channelName,
        options: options,
        uuid: uuid,
        emittedMessagesIds: emittedMessagesIds,
        writeQueue: writeQueue
    };

    state.listener = addStorageEventListener(channelName, function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(msgObj) {
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            if (state.messagesCallback) {
                                _context2.next = 2;
                                break;
                            }

                            return _context2.abrupt('return');

                        case 2:
                            if (!(msgObj.uuid === uuid)) {
                                _context2.next = 4;
                                break;
                            }

                            return _context2.abrupt('return');

                        case 4:
                            if (!(!msgObj.token || emittedMessagesIds.has(msgObj.token))) {
                                _context2.next = 6;
                                break;
                            }

                            return _context2.abrupt('return');

                        case 6:
                            if (!(msgObj.time && msgObj.time < state.messagesCallbackTime)) {
                                _context2.next = 8;
                                break;
                            }

                            return _context2.abrupt('return');

                        case 8:
                            // too old

                            emittedMessagesIds.add(msgObj.token);
                            setTimeout(function () {
                                return emittedMessagesIds['delete'](msgObj.token);
                            }, options.localstorage.removeTimeout);
                            state.messagesCallback(msgObj.data);

                        case 11:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, _this);
        }));

        return function (_x4) {
            return _ref2.apply(this, arguments);
        };
    }());

    return state;
}

export function close(channelState) {
    removeStorageEventListener(channelState.listener);
    channelState.writeQueue.clear();
}

export function onMessage(channelState, fn, time) {
    channelState.messagesCallbackTime = time;
    channelState.messagesCallback = fn;
}

export function canBeUsed() {
    if (isNode) return false;
    var ls = getLocalStorage();

    if (!ls) return false;
    return true;
};