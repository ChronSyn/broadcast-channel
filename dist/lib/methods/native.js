'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.create = create;
exports.close = close;
exports.postMessage = postMessage;
exports.onMessage = onMessage;
exports.canBeUsed = canBeUsed;
var isNode = require('detect-node');

var type = exports.type = 'native';

function create(channelName, options) {
    if (!options) options = {};
    var state = {
        channelName: channelName,
        options: options,
        messagesCallback: null,
        bc: new BroadcastChannel(channelName),
        subscriberFunctions: []
    };

    state.bc.onmessage = function (msg) {
        if (state.messagesCallback) {
            state.messagesCallback(msg.data);
        }
    };

    return state;
};

function close(channelState) {
    channelState.bc.close();
    channelState.subscriberFunctions = [];
}

function postMessage(channelState, messageJson) {
    channelState.bc.postMessage(messageJson, false);
}

function onMessage(channelState, fn, time) {
    channelState.messagesCallbackTime = time;
    channelState.messagesCallback = fn;
}

function canBeUsed() {
    if (isNode) return false;

    if (typeof BroadcastChannel === 'function') return true;
};