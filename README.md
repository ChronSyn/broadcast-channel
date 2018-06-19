# broadcast-channel
A Broadcast Channel Implementation that works with old browsers, new browsers, WebWorkers and NodeJs.


# methods:

- Native BroadcastChannel
- IndexedDB (older browsers)
- LocalStorage (really old browser)
- Cookies (fucking old browsers)
- [node-ipc](https://www.npmjs.com/package/node-ipc) (nodeJs)



## What this is not
- This is not a polyfill. Do not set this module to `window.BroadcastChannel`
- This is not a replacement for a message queue. If you send more than 50 messages per second, you proper [IPC-Tooling](https://en.wikipedia.org/wiki/Message_queue)
