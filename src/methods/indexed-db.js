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
 * after this time the messages get deleted
 * It is assumed that all reader have consumed it by then
 */
const MESSAGE_TTL = 1000 * 45; // 30 seconds

/**
 * if the 'storage'-even can not be used,
 * we poll in this interval
 */
const FALLBACK_INTERVAL = 0;

export const type = 'idb';

export function getIdb() {
    if (typeof indexedDB !== 'undefined') return indexedDB;
    if (typeof mozIndexedDB !== 'undefined') return mozIndexedDB;
    if (typeof webkitIndexedDB !== 'undefined') return webkitIndexedDB;
    if (typeof msIndexedDB !== 'undefined') return msIndexedDB;

    return false;
}

export async function createDatabase(channelName) {
    const IndexedDB = getIdb();

    // create table
    const dbName = DB_PREFIX + channelName;
    const openRequest = IndexedDB.open(dbName, 1);

    openRequest.onupgradeneeded = ev => {
        const db = ev.target.result;
        db.createObjectStore(OBJECT_STORE_ID, {
            keyPath: 'id',
            autoIncrement: true
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
            } else {
                res(ret);
            }
        };
    });
}

export async function getMessagesHigherThen(db, lastCursorId) {
    const objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
    const ret = [];
    const keyRangeValue = IDBKeyRange.bound(lastCursorId + 1, Infinity);
    return new Promise(res => {
        objectStore.openCursor(keyRangeValue).onsuccess = ev => {
            const cursor = ev.target.result;
            if (cursor) {
                ret.push(cursor.value);
                //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
                cursor.continue();
            } else {
                res(ret);
            }
        };
    });
}

export async function removeMessageById(db, id) {
    const request = db.transaction([OBJECT_STORE_ID], 'readwrite')
        .objectStore(OBJECT_STORE_ID)
        .delete(id);
    return new Promise(res => {
        request.onsuccess = () => res();
    });
}

export async function getOldMessages(db, ttl){
    const olderThen = new Date().getTime() - ttl;
    const objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
    const ret = [];
    return new Promise(res => {
        objectStore.openCursor().onsuccess = ev => {
            const cursor = ev.target.result;
            if (cursor) {
                const msgObk = cursor.value;
                if (msgObk.time < olderThen) {
                    ret.push(msgObk);
                    //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
                    cursor.continue();
                } else {
                    // no more old messages,
                    res(ret);
                    return;
                }
            } else {
                res(ret);
            }
        };
    });
}

export async function cleanOldMessages(db, ttl = MESSAGE_TTL) {
    const tooOld = await getOldMessages(db, ttl);
    return Promise.all(
        tooOld.map(msgObj => removeMessageById(db, msgObj.id))
    );
}

export async function create(channelName, options = {}) {
    const uuid = randomToken(10);

    // set defaults
    if (!options.idb) options.idb = {};
    if (!options.idb.ttl) options.idb.ttl = MESSAGE_TTL;
    if (!options.idb.fallbackInterval) options.idb.fallbackInterval = FALLBACK_INTERVAL;

    // ensures we do not read messages in parrallel
    const readQueue = new IdleQueue(1);
    const writeQueue = new IdleQueue(1);

    const db = await createDatabase(channelName);
    const state = {
        closed: false,
        lastCursorId: 0,
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

    /**
     * if service-workers are used,
     * we have no 'storage'-event if they post a message,
     * therefore we also have to set an interval
     */
    (async () => {
        while (state.closed === false) {
            await handleMessagePing(state);
            await new Promise(res => setTimeout(res, state.options.idb.fallbackInterval));
        }
    })();

    return state;
}

/**
 * when the storage-event pings, so that we now new messages came,
 * run this
 */
export async function handleMessagePing(state) {
    /**
     * when there are no listener, we do nothing
     */
    if (!state.messagesCallback) return;

    /**
     * if we have 2 or more read-tasks in the queue,
     * we do not have to set more
     */
    if (state.readQueue._idleCalls.size > 1) return;

    await state.readQueue.requestIdlePromise();
    await state.readQueue.wrapCall(
        async () => {

            const newerMessages = await getMessagesHigherThen(state.db, state.lastCursorId);
            const useMessages = newerMessages
                .map(msgObj => {
                    if (msgObj.id > state.lastCursorId) {
                        state.lastCursorId = msgObj.id;
                    }
                    return msgObj;
                })
                .filter(msgObj => msgObj.uuid !== state.uuid) // not send by own
                .filter(msgObj => !state.emittedMessagesIds.has(msgObj.id)) // not already emitted
                .filter(msgObj => msgObj.time >= state.messagesCallbackTime) // not older then onMessageCallback
                .sort((msgObjA, msgObjB) => msgObjA.time - msgObjB.time); // sort by time

            for (const msgObj of useMessages) {
                if (state.messagesCallback) {
                    state.emittedMessagesIds.add(msgObj.id);
                    setTimeout(
                        () => state.emittedMessagesIds.delete(msgObj.id),
                        state.options.idb.ttl * 2
                    );

                    state.messagesCallback(msgObj.data);
                }
            }
        }
    );
}

export function close(channelState) {
    channelState.closed = true;
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

    if (randomInt(0, 10) === 0) {
        /* await (do not await) */ cleanOldMessages(
            channelState.db,
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

    if (!idb) return false;
    return true;
};
