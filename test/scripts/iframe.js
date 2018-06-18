/* eslint-disable */
/**
 * used in docs/iframe.html
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

const channelName = getParameterByName('channelName');
const methodType = getParameterByName('methodType');

// overwrite console.log
const logBefore = console.log;
console.log = function (str) { logBefore('iframe: ' + str); }

var channel = new BroadcastChannel(channelName, {
    type: methodType
});
var msgContainer = document.getElementById('messages');
channel.onmessage = function (msg) {
    console.log('recieved message(' + msg.step + ') from ' + msg.from + ': ' + JSON.stringify(msg));

    var textnode = document.createTextNode(JSON.stringify(msg) + '</br>');
    msgContainer.appendChild(textnode);

    if (!msg.answer) {
        console.log('answer back(' + msg.step + ')');
        channel.postMessage({
            answer: true,
            from: 'iframe',
            original: msg
        });
    }
};