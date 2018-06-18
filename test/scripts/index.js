/* eslint-disable */
/**
 * used in docs/index.html
 */
require('babel-polyfill');
var BroadcastChannel = require('../../dist/lib/index.js');

// https://stackoverflow.com/a/901144/3443137
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var methodType = getParameterByName('methodType');
if (!methodType || methodType === '' || methodType === 'default') methodType = undefined;

var TEST_MESSAGES = 50;
var body = document.getElementById('body');
var msgContainer = document.getElementById('messages');
var rightContainer = document.getElementById('right');
var messageCountContainer = document.getElementById('msg-count');
var stateContainer = document.getElementById('state');
const iframeEl = document.getElementById('test-iframe');

document.getElementById('user-agent').innerHTML = navigator.userAgent;

var startTime = new Date().getTime();
const options = {};
console.log('++++++');
console.log(typeof BroadcastChannel);
var channel = new BroadcastChannel('foobar', {
    type: methodType
});
document.getElementById('method').innerHTML = channel.type;

/**
 * to measure the speed, we:
 * 1. send message
 * 2. wait until iframe and worker answers
 * 3. repeat from 1. for TEST_MESSAGES times
 */
var messagesSend = 0;
var answerPool = {};
channel.onmessage = function (msg) {
    console.log('main: recieved msg' + JSON.stringify(msg));

    answerPool[msg.from] = msg;
    var textnode = document.createTextNode(JSON.stringify(msg) + '</br>');
    msgContainer.appendChild(textnode);

    if (answerPool.worker && answerPool.iframe) {
        answerPool = {}; // reset

        if (messagesSend >= TEST_MESSAGES) {
            // sucess
            console.log('main: sucess');
            body.style.backgroundColor = 'green';
            stateContainer.innerHTML = 'SUCCESS'
            const amountTime = new Date().getTime() - startTime;
            document.getElementById('time-amount').innerHTML = amountTime + 'ms';
        } else {
            // send next message
            messagesSend++;
            console.log('main: send next message (' + messagesSend + ') ====================');
            messageCountContainer.innerHTML = messagesSend;
            channel.postMessage({
                from: 'main',
                foo: 'bar',
                step: messagesSend
            });
        }
    }
};

// set iframe src
var rand = new Date().getTime();
iframeEl.src = './iframe.html?channelName=' + channel.name + '&methodType=' + channel.type + '&t=' + rand;

// w8 until iframe has loaded
iframeEl.onload = function () {
    console.log('main: Iframe has loaded');
    // spawn web-worker
    var worker = new Worker('worker.js?t=' + rand);
    worker.onerror = function (event) {
        throw new Error('worker: ' + event.message + " (" + event.filename + ":" + event.lineno + ")");
    };

    worker.addEventListener('message', function (e) {
        // run when message returned, so we know the worker has started
        console.log('main: Worker has started');

        console.log('========== START SENDING MESSAGES ' + channel.type);
        channel.postMessage({
            from: 'main',
            step: 0
        });
        console.log('main: message send (0)');
    }, false);
    worker.postMessage({
        'cmd': 'start',
        'msg': {
            channelName: channel.name,
            methodType: channel.type
        }
    });
}