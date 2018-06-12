/* eslint-disable */
/**
 * used in the test-docs as web-worker
 */


var BroadcastChannel = require('../../dist/lib/index.js');

var channel = new BroadcastChannel('foobar');
var messages = [];
channel.onmessage = function(msg) {
    console.log('worker: got message (' + msg.step + '): ' + JSON.stringify(msg));
    if (!msg.answer) {
        console.log('worker: answer back');
        channel.postMessage({
            answer: true,
            from: 'worker',
            original: msg
        });
    }
};

self.addEventListener('message', function(e) {
    var data = e.data;
    switch (data.cmd) {
        case 'start':
            self.postMessage('WORKER STARTED: ' + data.msg);
            break;
        case 'stop':
            self.postMessage('WORKER STOPPED: ' + data.msg + '. (buttons will no longer work)');
            self.close(); // Terminates the worker.
            break;
        default:
            self.postMessage('Unknown command: ' + data.msg);
    };
}, false);
