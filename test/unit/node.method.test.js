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
});
