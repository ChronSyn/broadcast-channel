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

const KEY_PREFIX = 'pubkey.broadcastChannel-';
const REMOVE_TIMEOUT = 1000 * 60;
export const type = 'localstorage';

/**
 * copied from crosstab
 * @link https://github.com/tejacques/crosstab/blob/master/src/crosstab.js#L32
 */
export function getLocalStorage() {
    let localStorage;
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
export async function postMessage(channelState, messageJson) {
    await new Promise(res => setTimeout(res, 0));

    const key = storageKey(channelState.channelName);
    const writeObj = {
        token: randomToken(10),
        time: new Date().getTime(),
        data: messageJson,
        uuid: channelState.uuid
    };
    const value = JSON.stringify(writeObj);
    localStorage.setItem(key, value);

    /**
     * StorageEvent does not fire the 'storage' event
     * in the window that changes the state of the local storage.
     * So we fire it manually
     */
    const ev = document.createEvent('Event');
    ev.initEvent('storage', true, true);
    ev.key = key;
    ev.newValue = value;
    window.dispatchEvent(ev);
}

export function addStorageEventListener(channelName, fn) {
    const key = storageKey(channelName);
    const listener = ev => {
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

export function create(channelName, options = {}) {
    if(!canBeUsed()){
        throw new Error('BroadcastChannel: localstorage cannot be used');
    }

    const startTime = new Date().getTime();
    const uuid = randomToken(10);

    // set defaults
    if (!options.localstorage) options.localstorage = {};
    if (!options.localstorage.removeTimeout) options.localstorage.removeTimeout = REMOVE_TIMEOUT;

    // contains all messages that have been emitted before
    const emittedMessagesIds = new Set();

    const writeQueue = new IdleQueue(1);

    const state = {
        startTime,
        channelName,
        options,
        uuid,
        emittedMessagesIds,
        writeQueue
    };


    state.listener = addStorageEventListener(
        channelName,
        async (msgObj) => {
            if (!state.messagesCallback) return; // no listener
            if (msgObj.uuid === uuid) return; // own message
            if (!msgObj.token || emittedMessagesIds.has(msgObj.token)) return; // already emitted
            if (msgObj.time && msgObj.time < state.messagesCallbackTime) return; // too old

            emittedMessagesIds.add(msgObj.token);
            setTimeout(
                () => emittedMessagesIds.delete(msgObj.token),
                options.localstorage.removeTimeout
            );
            state.messagesCallback(msgObj.data);
        }
    );


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
    const ls = getLocalStorage();

    if (!ls) return false;
    return true;
};
