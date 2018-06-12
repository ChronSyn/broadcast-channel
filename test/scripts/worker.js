/* eslint-disable */
/**
 * used in the test-docs as web-worker
 */


// overwrite console.log
const logBefore = console.log;
console.log = str => logBefore('worker: ' + str);

var BroadcastChannel = require('../../dist/lib/index.js');

var channel = new BroadcastChannel('foobar');
var messages = [];
channel.onmessage = function(msg) {
    console.log('recieved message(' + msg.step + ') from ' + msg.from + ': ' + JSON.stringify(msg));
    if (!msg.answer) {
        console.log('(' + msg.step + ') answer back');
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
