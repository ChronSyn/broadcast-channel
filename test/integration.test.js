const AsyncTestUtil = require('async-test-util');
const assert = require('assert');
const isNode = require('detect-node');
const BroadcastChannel = require('../');

/**
 * we run this test once per method
 */
function runTest(channelType) {
    const channelOptions = {
        type: channelType
    };

    describe('integration.test.js', () => {
        describe('.constructor()', () => {
            it('asdf', () => {
                console.log('Started: ' + channelType);
            });
            it('should create a channel', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channel = new BroadcastChannel(channelName, channelOptions);
                channel.close();
            });
        });
        describe('.postMessage()', () => {
            it('should post a message', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channel = new BroadcastChannel(channelName, channelOptions);
                await channel.postMessage('foobar');
                channel.close();
            });
            it('should throw if channel is already closed', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channel = new BroadcastChannel(channelName, channelOptions);
                channel.close();
                await AsyncTestUtil.assertThrows(
                    () => channel.postMessage('foobar'),
                    Error,
                    'closed'
                );
            });
        });
        describe('.onmessage', () => {
            /**
             * the window.BroadcastChannel
             * does not emit postMessage to own subscribers,
             * if you want to do that, you have to create another channel
             */
            it('should NOT recieve the message on own', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channel = new BroadcastChannel(channelName, channelOptions);

                const emitted = [];
                channel.onmessage = msg => emitted.push(msg);
                await channel.postMessage({
                    foo: 'bar'
                });

                await AsyncTestUtil.wait(100);
                assert.equal(emitted.length, 0);

                channel.close();
            });
            it('should recieve the message on other channel', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channel = new BroadcastChannel(channelName, channelOptions);
                const otherChannel = new BroadcastChannel(channelName, channelOptions);

                const emitted = [];
                otherChannel.onmessage = msg => emitted.push(msg);
                await channel.postMessage({
                    foo: 'bar'
                });
                await AsyncTestUtil.waitUntil(() => emitted.length === 1);
                assert.equal(emitted[0].foo, 'bar');
                channel.close();
                otherChannel.close();
            });
            it('should not confuse messages between different channels', async () => {
                const channel = new BroadcastChannel(AsyncTestUtil.randomString(12), channelOptions);
                const otherChannel = new BroadcastChannel(AsyncTestUtil.randomString(12), channelOptions);

                const emitted = [];
                otherChannel.onmessage = msg => emitted.push(msg);
                await channel.postMessage({
                    foo: 'bar'
                });
                await AsyncTestUtil.wait(100);
                assert.equal(emitted.length, 0);

                channel.close();
                otherChannel.close();
            });
            it('should not read messages created before the channel was created', async () => {
                const channelName = AsyncTestUtil.randomString(12);
                const channel = new BroadcastChannel(channelName, channelOptions);

                const msgJson = {
                    foo: 'bar'
                };

                await channel.postMessage(msgJson);
                await AsyncTestUtil.wait(50);

                const otherChannel = new BroadcastChannel(channelName, channelOptions);
                const emittedOther = [];
                otherChannel.onmessage = msg => emittedOther.push(msg);

                await channel.postMessage(msgJson);
                await channel.postMessage(msgJson);

                await AsyncTestUtil.waitUntil(() => emittedOther.length >= 2);
                await AsyncTestUtil.wait(100);

                assert.equal(emittedOther.length, 2);

                channel.close();
                otherChannel.close();
            });
        });
        describe('.type', () => {
            it('should get a type', async () => {
                const channel = new BroadcastChannel(AsyncTestUtil.randomString(12), channelOptions);
                const type = channel.type;
                assert.equal(typeof type, 'string');
                assert.notEqual(type, '');

                channel.close();
            });
        });
        describe('other', () => {
            it('', () => {
                console.log('Finiished: ' + channelType);
            });
        });
    });
};

if (isNode) {
    runTest('node');
} else {
    runTest('idb');
    runTest('native');
}
