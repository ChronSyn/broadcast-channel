const AsyncTestUtil = require('async-test-util');
const assert = require('assert');
const BroadcastChannel = require('../');

describe('integration.test.js', () => {
    describe('.constructor()', () => {
        it('should create a channel', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const channel = new BroadcastChannel(channelName);
            channel.close();
        });
    });
    describe('.postMessage()', () => {
        it('should post a message', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const channel = new BroadcastChannel(channelName);
            await channel.postMessage('foobar');
            channel.close();
        });
        it('should throw if channel is already closed', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const channel = new BroadcastChannel(channelName);
            channel.close();
            await AsyncTestUtil.assertThrows(
                () => channel.postMessage('foobar'),
                Error,
                'closed'
            );
        });
    });
    describe('.onmessage', () => {
        it('should recieve the message on own', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const channel = new BroadcastChannel(channelName);

            const emitted = [];
            channel.onmessage = msg => emitted.push(msg);
            await channel.postMessage({
                foo: 'bar'
            });
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.equal(emitted[0].foo, 'bar');
            channel.close();
        });
        it('should recieve the message on other channel', async () => {
            const channelName = AsyncTestUtil.randomString(12);
            const channel = new BroadcastChannel(channelName);
            const otherChannel = new BroadcastChannel(channelName);

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
            const channel = new BroadcastChannel(AsyncTestUtil.randomString(12));
            const otherChannel = new BroadcastChannel(AsyncTestUtil.randomString(12));

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
            const channel = new BroadcastChannel(channelName);

            const msgJson = {
                foo: 'bar'
            };

            await channel.postMessage(msgJson);
            await AsyncTestUtil.wait(50);

            const otherChannel = new BroadcastChannel(channelName);
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
            const channel = new BroadcastChannel(AsyncTestUtil.randomString(12));
            const type = channel.type;
            assert.equal(typeof type, 'string');
            assert.notEqual(type, '');

            channel.close();
        });
    });
});
