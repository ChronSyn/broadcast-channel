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
    describe('core-functions', () => {
        describe('.create()', () => {
            it('should create a channelState', async () => {
                const channelName = AsyncTestUtil.randomString(10);
                const channelState = await IndexedDbMethod.create(channelName);
                assert.ok(channelState);
                IndexedDbMethod.close(channelState);
            });
            it('should be called twice', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelState1 = await IndexedDbMethod.create(channelName);
                const channelState2 = await IndexedDbMethod.create(channelName);
                assert.ok(channelState1);
                assert.ok(channelState2);

                await IndexedDbMethod.close(channelState1);
                await IndexedDbMethod.close(channelState2);
            });
        });
        describe('.postMessage()', () => {
            it('should not crash', async () => {
                const channelName = AsyncTestUtil.randomString(10);
                const channelState = await IndexedDbMethod.create(channelName);
                assert.ok(channelState);
                await IndexedDbMethod.postMessage(channelState, {
                    foo: 'bar'
                });
                IndexedDbMethod.close(channelState);
            });
        });
        describe('.onMessage()', () => {
            it('should emit the message on self', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelStateOwn = await IndexedDbMethod.create(channelName);

                const msgJson = {
                    foo: 'bar'
                };

                const emitted = [];
                IndexedDbMethod.onMessage(channelStateOwn, msg => emitted.push(msg));
                IndexedDbMethod.postMessage(channelStateOwn, msgJson);

                await AsyncTestUtil.waitUntil(() => emitted.length === 1);
                assert.deepEqual(emitted[0], msgJson);

                await IndexedDbMethod.close(channelStateOwn);
            });
            it('should emit the message on other', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelStateOther = await IndexedDbMethod.create(channelName);
                const channelStateOwn = await IndexedDbMethod.create(channelName);

                const emittedOther = [];
                const emittedOwn = [];
                const msgJson = {
                    foo: 'bar'
                };

                IndexedDbMethod.onMessage(channelStateOther, msg => emittedOther.push(msg));
                IndexedDbMethod.onMessage(channelStateOwn, msg => emittedOwn.push(msg));

                await IndexedDbMethod.postMessage(channelStateOwn, msgJson);



                await AsyncTestUtil.waitUntil(() => emittedOwn.length === 1);
                await AsyncTestUtil.waitUntil(() => emittedOther.length === 1);

                assert.deepEqual(emittedOwn[0], msgJson);
                assert.deepEqual(emittedOther[0], msgJson);

                await IndexedDbMethod.close(channelStateOther);
                await IndexedDbMethod.close(channelStateOwn);
            });
        });
    });
    describe('other', () => {
        it('should have cleaned up the messages', async () => {
            const channelOptions = {
                idb: {
                    ttl: 500
                }
            };
            const channelName = AsyncTestUtil.randomString(12);
            const channelStateOther = await IndexedDbMethod.create(channelName, channelOptions);
            const channelStateOwn = await IndexedDbMethod.create(channelName, channelOptions);
            const msgJson = {
                foo: 'bar'
            };

            // send 100 messages
            await Promise.all(
                new Array(100).fill(0)
                .map(() => IndexedDbMethod.postMessage(channelStateOwn, msgJson))
            );

            // w8 until ttl has reached
            await AsyncTestUtil.wait(channelOptions.idb.ttl);

            // send 100 messages again to trigger cleanup
            await Promise.all(
                new Array(100).fill(0)
                .map(() => IndexedDbMethod.postMessage(channelStateOwn, msgJson))
            );

            // ensure only the last 100 messages are here
            const messages = await IndexedDbMethod.getAllMessages(channelStateOwn.db);
            assert.equal(messages.length, 100);


            await IndexedDbMethod.close(channelStateOther);
            await IndexedDbMethod.close(channelStateOwn);
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
