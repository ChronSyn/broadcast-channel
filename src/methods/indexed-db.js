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

const DB_PREFIX = 'pubkey.broadcast-channel-0-';
const OBJECT_STORE_ID = 'messages';
/**
 * after this time the messages gets deleted
 * It is assumed that all reader have consumed it by then
 */
const MESSAGE_TTL = 1000 * 60 * 2; // 2 minutes


export const type = 'idb';

export function getIdb() {
    const IndexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    const IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    const IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    return {
        IndexedDB,
        IDBTransaction,
        IDBKeyRange
    };
}

export async function createDatabase(channelName) {
    const {
        IndexedDB
    } = getIdb();

    // create table
    const dbName = DB_PREFIX + channelName;
    const openRequest = IndexedDB.open(dbName, 1);

    openRequest.onupgradeneeded = ev => {
        const db = ev.target.result;
        db.createObjectStore(OBJECT_STORE_ID, {
            keyPath: 'token' // primary
        });
    };
    const db = await new Promise((res, rej) => {
        openRequest.onerror = ev => rej(ev);
        openRequest.onsuccess = () => {
            res(openRequest.result);
        };
    });

    return db;
}
/**
 * writes the new message to the database
 * so other readers can find it
 */
export async function writeMessage(db, readerUuid, messageJson) {
    const time = new Date().getTime();
    const writeObject = {
        token: randomToken(12),
        uuid: readerUuid,
        time,
        data: messageJson
    };

    const transaction = db.transaction([OBJECT_STORE_ID], 'readwrite');

    return new Promise((res, rej) => {
        transaction.oncomplete = () => res();
        transaction.onerror = ev => rej(ev);

        const objectStore = transaction.objectStore(OBJECT_STORE_ID);
        objectStore.add(writeObject);
    });
}

export async function getAllMessages(db) {
    const objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
    const ret = [];
    return new Promise(res => {
        objectStore.openCursor().onsuccess = ev => {
            const cursor = ev.target.result;
            if (cursor) {
                ret.push(cursor.value);
                //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
                cursor.continue();
            } else
                res(ret);
        };
    });
}

export async function cleanOldMessages(db, messageObjects, ttl = MESSAGE_TTL) {
    const olderThen = new Date().getTime() - ttl;

    await Promise.all(
        messageObjects
        .filter(obj => obj.time < olderThen)
        .map(obj => {
            const request = db.transaction([OBJECT_STORE_ID], 'readwrite')
                .objectStore(OBJECT_STORE_ID)
                .delete(obj.token);
            return new Promise(res => {
                request.onsuccess = () => res();
            });
        })
    );
}

/**
 * sends a ping over the 'storage'-event
 * so other instances now that there are new messages
 */
export function pingOthers(channelName) {
    const storageKey = DB_PREFIX + channelName;

    /**
     * a random token must be set
     * because chrome will not send the storage-event
     * if prev- and now-value is equal
     */
    const value =  randomToken(10);
    localStorage.setItem(storageKey, value);

    /**
     * StorageEvent does not fire the 'storage' event
     * in the window that changes the state of the local storage.
     * So we fire it manually
     */
    const ev = document.createEvent('Event');
    ev.initEvent('storage', true, true);
    ev.key = storageKey;
    ev.newValue = value;
    window.dispatchEvent(ev);
};

export function addStorageEventListener(channelName, fn) {
    const storageKey = DB_PREFIX + channelName;
    const listener = ev => {
        if (ev.key === storageKey)
            fn();
    };
    window.addEventListener('storage', listener);
    return listener;
}
export function removeStorageEventListener(listener) {
    window.removeEventListener('storage', listener);
}

export async function create(channelName, options = {}) {
    const uuid = randomToken(10);

    // set defaults
    if (!options.idb) options.idb = {};
    if (!options.idb.ttl) options.idb.ttl = MESSAGE_TTL;

    // ensures we do not read messages in parrallel
    const readQueue = new IdleQueue(1);
    const writeQueue = new IdleQueue(1);

    const db = await createDatabase(channelName);

    const state = {
        channelName,
        options,
        uuid,
        // contains all messages that have been emitted before
        emittedMessagesIds: new Set(),
        messagesCallback: null,
        readQueue,
        writeQueue,
        db
    };

    state.listener = addStorageEventListener(
        channelName,
        () => handleMessagePing(state)
    );

    return state;
}

/**
 * when the storage-event pings, so that we now new messages came,
 * run this
 */
export async function handleMessagePing(state) {
    /**
     * if we have 2 or more read-tasks in the queue,
     * we do not have to set more
     */
    if (state.readQueue._idleCalls.size > 1) return;

    /**
     * when there are no listener, we do nothing
     */
    if (!state.messagesCallback) return;

    await state.readQueue.requestIdlePromise();
    await state.readQueue.wrapCall(
        async () => {
            const messages = await getAllMessages(state.db);
            const useMessages = messages
                .filter(msgObj => msgObj.uuid !== state.uuid) // not send by own
                .filter(msgObj => !state.emittedMessagesIds.has(msgObj.token)) // not already emitted
                .filter(msgObj => msgObj.time >= state.messagesCallbackTime) // not older then onMessageCallback
                .sort((msgObjA, msgObjB) => msgObjA.time - msgObjB.time); // sort by time

            for (const msgObj of useMessages) {
                if (state.messagesCallback) {
                    state.emittedMessagesIds.add(msgObj.token);
                    setTimeout(
                        () => state.emittedMessagesIds.delete(msgObj.token),
                        state.options.idb.ttl * 2
                    );

                    state.messagesCallback(msgObj.data);
                }
            }
        }
    );
}

export function close(channelState) {
    removeStorageEventListener(channelState.listener);
    channelState.readQueue.clear();
    channelState.writeQueue.clear();
    channelState.db.close();
}

export async function postMessage(channelState, messageJson) {
    await writeMessage(
        channelState.db,
        channelState.uuid,
        messageJson
    );
    pingOthers(channelState.channelName);

    if (randomInt(0, 5) === 0) {
        const messages = await getAllMessages(channelState.db);
        await cleanOldMessages(
            channelState.db,
            messages,
            channelState.options.idb.ttl
        );
    }
}

export function onMessage(channelState, fn, time) {
    channelState.messagesCallbackTime = time;
    channelState.messagesCallback = fn;
    handleMessagePing(channelState);
}

export function canBeUsed() {
    if (isNode) return false;
    const idb = getIdb();

    if (!idb.IndexedDB) return false;
    return true;
};
