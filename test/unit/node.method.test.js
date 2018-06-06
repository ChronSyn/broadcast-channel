const AsyncTestUtil = require('async-test-util');
const assert = require('assert');
const BroadcastChannel = require('../../dist/lib/index').default;
const NodeMethod = require('../../dist/lib/methods/node.js');

describe('unit/node.method.test.js', () => {

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
                        console.log('client: Connected');
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
});
