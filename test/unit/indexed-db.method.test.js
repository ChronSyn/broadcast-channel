const AsyncTestUtil = require('async-test-util');
const assert = require('assert');
const IndexedDbMethod = require('../../dist/lib/methods/indexed-db.js');

describe('unit/node.method.test.js', () => {
    describe('.getIdb()', () => {
        it('should get an object', () => {
            const idb = IndexedDbMethod.getIdb();
            assert.ok(idb);
            assert.ok(idb.IndexedDB);
        });
    });
    describe('.createDatabase()', () => {
        it('should create a database', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const db = await IndexedDbMethod.createDatabase(channelName);
            assert.ok(db);
        });
        it('should be able to call twice', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const db1 = await IndexedDbMethod.createDatabase(channelName);
            const db2 = await IndexedDbMethod.createDatabase(channelName);
            assert.ok(db1);
            assert.ok(db2);
            console.dir(db2);
        });
    });
    describe('.writeMessage()', () => {
        it('should write the message to the db', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const readerUuid = AsyncTestUtil.randomString(10);
            const db = await IndexedDbMethod.createDatabase(channelName);
            await IndexedDbMethod.writeMessage(db, readerUuid, {
                foo: 'bar'
            });
        });
    });
    describe('.getAllMessages()', () => {
        it('should get the message', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const readerUuid = AsyncTestUtil.randomString(10);
            const db = await IndexedDbMethod.createDatabase(channelName);
            await IndexedDbMethod.writeMessage(db, readerUuid, {
                foo: 'bar'
            });

            const messages = await IndexedDbMethod.getAllMessages(db);
            assert.equal(messages.length, 1);
            console.dir(messages);
            assert.equal(messages[0].data.foo, 'bar');
        });
        it('should get the messages', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const readerUuid = AsyncTestUtil.randomString(10);
            const db = await IndexedDbMethod.createDatabase(channelName);
            await IndexedDbMethod.writeMessage(db, readerUuid, {
                foo: 'bar'
            });
            await IndexedDbMethod.writeMessage(db, readerUuid, {
                foo: 'bar2'
            });

            const messages = await IndexedDbMethod.getAllMessages(db);
            assert.equal(messages.length, 2);
            console.dir(messages);
        });
    });
    describe('.cleanOldMessages()', () => {
        it('should clean up old messages', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const readerUuid = AsyncTestUtil.randomString(10);
            const db = await IndexedDbMethod.createDatabase(channelName);
            const msgJson = {
                foo: 'bar'
            };
            await IndexedDbMethod.writeMessage(db, readerUuid, msgJson);

            await AsyncTestUtil.wait(500);

            const messages = await IndexedDbMethod.getAllMessages(db);
            await IndexedDbMethod.cleanOldMessages(db, messages, 200);

            IndexedDbMethod.getAllMessages(db); // call parallel
            const messagesAfter = await IndexedDbMethod.getAllMessages(db);
            assert.equal(messagesAfter.length, 0);
        });
    });
    describe('.pingOthers()', () => {
        it('should send and recieve a ping', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const emitted = [];
            const listener = IndexedDbMethod.addStorageEventListener(
                channelName,
                ev => emitted.push(ev)
            );

            IndexedDbMethod.pingOthers(channelName);
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);

            IndexedDbMethod.removeStorageEventListener(listener);
        });
        it('should not recieve pings from other channels', async () => {
            const channelName = AsyncTestUtil.randomString(10);
            const emitted = [];
            const listener = IndexedDbMethod.addStorageEventListener(
                channelName,
                ev => emitted.push(ev)
            );

            IndexedDbMethod.pingOthers(AsyncTestUtil.randomString(10));
            IndexedDbMethod.pingOthers(AsyncTestUtil.randomString(10));
            IndexedDbMethod.pingOthers(AsyncTestUtil.randomString(10));
            IndexedDbMethod.pingOthers(channelName);
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);

            await AsyncTestUtil.wait(100);
            assert.equal(emitted.length, 1);

            IndexedDbMethod.removeStorageEventListener(listener);
        });
    });

    describe('asdf', () => {
        it('asdf', () => {
            console.log('#######################');
            console.log('#######################');
            console.log('#######################');
            console.log('#######################');
        });
    });
});
