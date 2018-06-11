(async () => {
    const channel1 = new BroadcastChannel('foobar');
    const channel2 = new BroadcastChannel('foobar');

    await channel1.postMessage('foo1');
    await channel1.postMessage('foo2');

    const emitted = [];

    setTimeout(() => {

        channel2.onmessage = msg => emitted.push(msg);

        channel1.postMessage('foo3');

        setTimeout(() => {
            console.dir(emitted);
        }, 100);
    }, 100);
})();
