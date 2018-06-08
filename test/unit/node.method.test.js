const AsyncTestUtil = require('async-test-util');
const assert = require('assert');
const NodeMethod = require('../../dist/lib/methods/node.js');

describe('unit/node.method.test.js', () => {
    it('init', () => {
        process.setMaxListeners(0);
    });

    describe('.getPaths()', () => {
        it('should get the correct paths', () => {
            const channelName = AsyncTestUtil.randomString(12);
            const paths = NodeMethod.getPaths(channelName);
            assert.ok(paths.messages);
            assert.ok(paths.messages.includes(channelName));
        });
    });
    describe('.ensureFoldersExist()', () => {
        it('.ensureFoldersExist()', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            await NodeMethod.ensureFoldersExist(channelName);

            const paths = NodeMethod.getPaths(channelName);
            const exists = require('fs').existsSync(paths.messages);
            assert.ok(exists);
        });
        it('should not crash when called twice', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            await NodeMethod.ensureFoldersExist(channelName);
            await NodeMethod.ensureFoldersExist(channelName);
        });
    });
    describe('.createSocketEventEmitter()', () => {
        it('should create the socket and subscribe', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readerUuid = AsyncTestUtil.randomString(6);
            await NodeMethod.ensureFoldersExist(channelName);
            const socket = await NodeMethod.createSocketEventEmitter(channelName, readerUuid);
            assert.ok(socket);
        });
        it('should be able to connect to the socket and send data', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readerUuid = AsyncTestUtil.randomString(6);
            await NodeMethod.ensureFoldersExist(channelName);
            const socket = await NodeMethod.createSocketEventEmitter(channelName, readerUuid);

            const emitted = [];
            socket.emitter.on('data', msg => emitted.push(msg));

            const net = require('net');

            const client = new net.Socket();
            await new Promise(res => {
                client.connect(
                    socket.path,
                    () => {
                        res();
                    }
                );
            });

            client.write('foobar');

            await AsyncTestUtil.waitUntil(() => emitted.length, 1);
            assert.equal(emitted[0], 'foobar');

            client.destroy();
            socket.server.close();
        });
    });
    describe('.writeMessage()', () => {
        it('should write the message', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readerUuid = AsyncTestUtil.randomString(6);
            await NodeMethod.ensureFoldersExist(channelName);
            const messageJson = {
                foo: 'bar'
            };

            const msgPath = await NodeMethod.writeMessage(channelName, readerUuid, messageJson);

            const exists = require('fs').existsSync(msgPath);
            assert.ok(exists);

            const content = require(msgPath);
            assert.equal(content.uuid, readerUuid);
            assert.deepEqual(content.data, messageJson);
        });
    });
    describe('.getReadersUuids()', () => {
        it('should get all uuids', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            await NodeMethod.ensureFoldersExist(channelName);

            const sockets = await Promise.all(
                new Array(5).fill(0)
                .map(() => AsyncTestUtil.randomString(6))
                .map(readerUuid => NodeMethod.createSocketEventEmitter(channelName, readerUuid))
            );

            const uuids = await NodeMethod.getReadersUuids(channelName);
            assert.equal(uuids.length, 5);

            sockets.map(socket => socket.server.close());
        });
    });
    describe('.openClientConnection()', () => {
        it('should open a connection and send data', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readerUuid = AsyncTestUtil.randomString(6);
            await NodeMethod.ensureFoldersExist(channelName);

            const socket = await NodeMethod.createSocketEventEmitter(channelName, readerUuid);
            const client = await NodeMethod.openClientConnection(channelName, readerUuid);

            const emitted = [];
            socket.emitter.on('data', d => emitted.push(d));

            client.write('foo bar');

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.equal(emitted[0], 'foo bar');

            socket.server.close();
            client.destroy();
        });
    });
    describe('.getAllMessages()', () => {
        it('should get all messages', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readerUuid = AsyncTestUtil.randomString(6);
            await NodeMethod.ensureFoldersExist(channelName);

            const messageJson = {
                foo: 'bar'
            };
            await NodeMethod.writeMessage(channelName, readerUuid, messageJson);
            await NodeMethod.writeMessage(channelName, readerUuid, messageJson);

            const messages = await NodeMethod.getAllMessages(channelName);
            assert.equal(messages.length, 2);
            assert.ok(messages[0].path);
            assert.ok(messages[0].time);
            assert.ok(messages[0].senderUuid);
            assert.ok(messages[0].token);
        });
    });
    describe('.readMessage()', () => {
        it('should get the content', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readerUuid = AsyncTestUtil.randomString(6);
            await NodeMethod.ensureFoldersExist(channelName);

            const messageJson = {
                foo: 'bar'
            };
            await NodeMethod.writeMessage(channelName, readerUuid, messageJson);
            const messages = await NodeMethod.getAllMessages(channelName);

            const content = await NodeMethod.readMessage(messages[0]);
            assert.deepEqual(content.data, messageJson);
        });
    });
    describe('.cleanOldMessages()', () => {
        it('should clean up the old messages', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readerUuid = AsyncTestUtil.randomString(6);
            await NodeMethod.ensureFoldersExist(channelName);
            const messageJson = {
                foo: 'bar'
            };

            // write 5 messages
            await Promise.all(
                new Array(5).fill(0)
                .map(() => NodeMethod.writeMessage(channelName, readerUuid, messageJson))
            );

            // w8 until they time out
            await AsyncTestUtil.wait(500);

            // write a new one
            await NodeMethod.writeMessage(channelName, readerUuid, messageJson);

            const messages = await NodeMethod.getAllMessages(channelName);
            await NodeMethod.cleanOldMessages(messages, 100);

            const messages2 = await NodeMethod.getAllMessages(channelName);
            assert.equal(messages2.length, 1);
        });
    });
    describe('core-functions', () => {
        describe('.create()', () => {
            it('should open a channel', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelState = await NodeMethod.create(channelName);
                assert.ok(channelState);
                await NodeMethod.close(channelState);
            });
            it('should have connected to other readers', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelState1 = await NodeMethod.create(channelName);
                const channelState2 = await NodeMethod.create(channelName);
                assert.ok(channelState1);
                assert.ok(channelState2);

                await NodeMethod.close(channelState1);
                await NodeMethod.close(channelState2);
            });
        });
        describe('.postMessage()', () => {
            it('should send the message', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelStateOther = await NodeMethod.create(channelName);
                const channelStateOwn = await NodeMethod.create(channelName);

                const emittedOther = [];
                const emittedOwn = [];

                channelStateOther.socketEE.emitter.on('data', d => emittedOther.push(d));
                channelStateOwn.socketEE.emitter.on('data', d => emittedOwn.push(d));

                const msgJson = {
                    foo: 'bar'
                };
                await NodeMethod.postMessage(channelStateOwn, msgJson);

                await AsyncTestUtil.waitUntil(() => emittedOwn.length === 1);
                await AsyncTestUtil.waitUntil(() => emittedOther.length === 1);

                assert.deepEqual(emittedOwn[0], msgJson);

                await NodeMethod.close(channelStateOther);
                await NodeMethod.close(channelStateOwn);
            });
        });
        describe('.onMessage()', () => {
            it('should emit the message on self', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelStateOwn = await NodeMethod.create(channelName);

                const msgJson = {
                    foo: 'bar'
                };

                const emitted = [];
                NodeMethod.onMessage(channelStateOwn, msg => emitted.push(msg));

                NodeMethod.postMessage(channelStateOwn, msgJson);

                await AsyncTestUtil.waitUntil(() => emitted.length === 1);
                assert.deepEqual(emitted[0], msgJson);

                await NodeMethod.close(channelStateOwn);
            });
            it('should emit the message on other', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelStateOther = await NodeMethod.create(channelName);
                const channelStateOwn = await NodeMethod.create(channelName);

                const emittedOther = [];
                const emittedOwn = [];
                const msgJson = {
                    foo: 'bar'
                };

                NodeMethod.onMessage(channelStateOther, msg => emittedOther.push(msg));
                NodeMethod.onMessage(channelStateOwn, msg => emittedOwn.push(msg));

                await NodeMethod.postMessage(channelStateOwn, msgJson);



                await AsyncTestUtil.waitUntil(() => emittedOwn.length === 1);
                await AsyncTestUtil.waitUntil(() => emittedOther.length === 1);

                assert.deepEqual(emittedOwn[0], msgJson);
                assert.deepEqual(emittedOther[0], msgJson);

                await NodeMethod.close(channelStateOther);
                await NodeMethod.close(channelStateOwn);
            });
            it('should have sorted the messages by time', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channelStateOwn = await NodeMethod.create(channelName);

                const emitted = [];
                NodeMethod.onMessage(channelStateOwn, msg => emitted.push(msg));

                NodeMethod.postMessage(channelStateOwn, {
                    foo: 0
                });
                NodeMethod.postMessage(channelStateOwn, {
                    foo: 1
                });

                await AsyncTestUtil.waitUntil(() => emitted.length === 2);

                assert.equal(emitted[0].foo, 0);
                assert.equal(emitted[1].foo, 1);

                await NodeMethod.close(channelStateOwn);
            });
        });
    });
    describe('other', () => {
        it('should have cleaned up the messages', async () => {
            const channelOptions = {
                node: {
                    ttl: 500
                }
            };
            const channelName = AsyncTestUtil.randomString(12);
            const channelStateOther = await NodeMethod.create(channelName, channelOptions);
            const channelStateOwn = await NodeMethod.create(channelName, channelOptions);
            const msgJson = {
                foo: 'bar'
            };

            // send 100 messages
            await Promise.all(
                new Array(100).fill(0)
                .map(() => NodeMethod.postMessage(channelStateOwn, msgJson))
            );

            // w8 until ttl has reached
            await AsyncTestUtil.wait(channelOptions.node.ttl);

            // send 100 messages again to trigger cleanup
            await Promise.all(
                new Array(100).fill(0)
                .map(() => NodeMethod.postMessage(channelStateOwn, msgJson))
            );

            // ensure only the last 100 messages are here
            const messages = await NodeMethod.getAllMessages(channelName);
            assert.equal(messages.length, 100);


            await NodeMethod.close(channelStateOther);
            await NodeMethod.close(channelStateOwn);
        });
        it('should not read messages created before the channel was created', async () => {
            const channelOptions = {
                node: {
                    ttl: 5000
                }
            };
            const channelName = AsyncTestUtil.randomString(12);
            const channelStateOwn = await NodeMethod.create(channelName, channelOptions);
            const msgJson = {
                foo: 'bar'
            };


            await NodeMethod.postMessage(channelStateOwn, msgJson);

            const emittedOther = [];
            const channelStateOther = await NodeMethod.create(channelName, channelOptions);
            NodeMethod.onMessage(channelStateOther, msg => emittedOther.push(msg));

            await NodeMethod.postMessage(channelStateOwn, msgJson);
            await NodeMethod.postMessage(channelStateOwn, msgJson);

            await AsyncTestUtil.waitUntil(() => emittedOther.length >= 2);
            await AsyncTestUtil.wait(100);

            assert.equal(emittedOther.length, 2);

            await NodeMethod.close(channelStateOther);
            await NodeMethod.close(channelStateOwn);
        });
        it('should work with many readers', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const readers = await Promise.all(
                new Array(50).fill(0)
                .map(async () => {
                    const channelState = await NodeMethod.create(channelName);
                    const emitted = [];
                    NodeMethod.onMessage(channelState, msg => emitted.push(msg));
                    return {
                        channelState,
                        emitted
                    };
                })
            );

            // send 100 messages
            await Promise.all(
                new Array(100).fill(0)
                .map(() => NodeMethod.postMessage(readers[5].channelState, {
                    foo: 'bar'
                }))
            );

            await AsyncTestUtil.waitUntil(() => {
                let ok = true;
                readers.forEach(reader => {
                    if (reader.emitted.length !== 100)
                        ok = false;
                });

                return ok;
            });

            await Promise.all(
                readers.map(reader => NodeMethod.close(reader.channelState))
            );
        });
    });
});
