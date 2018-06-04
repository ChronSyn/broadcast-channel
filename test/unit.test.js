const AsyncTestUtil = require('async-test-util');
const assert = require('assert');
const BroadcastChannel = require('../dist/lib/index').default;

describe('unit.test.js', () => {
    describe('methods', () => {
        describe('node-ipc', () => {
            it('should create a channel', async () => {
                const id = AsyncTestUtil.randomString(10);
                const channel = new BroadcastChannel(id);
                assert.ok(channel);
                channel.close();
                await AsyncTestUtil.wait(200);
                process.exit();
            });
            it('add subscription', async () => {
                const id = AsyncTestUtil.randomString(10);
                const channel = new BroadcastChannel(id);
                assert.ok(channel);
                await AsyncTestUtil.wait(200);
                channel.onmessage = data => received.push(data);
                channel.close();
                process.exit();
            });
            it('should send a message between two channels', async () => {
                const id = AsyncTestUtil.randomString(10);
                const channel1 = new BroadcastChannel(id);
                const channel2 = new BroadcastChannel(id);

                const received = [];
                channel2.onmessage = data => received.push(data);
                await channel1.postMessage('foobar');

                await AsyncTestUtil.waitUntil(() => received.length === 1);

                console.dir(received);
                channel1.close();
                channel2.close();
            });
        });
    });

});
