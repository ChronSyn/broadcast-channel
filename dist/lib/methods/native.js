'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.type = undefined;
exports.create = create;
exports.close = close;
exports.postMessage = postMessage;
exports.onMessage = onMessage;
exports.canBeUsed = canBeUsed;

var _detectNode = require('detect-node');

var _detectNode2 = _interopRequireDefault(_detectNode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var type = exports.type = 'native';

function create(channelName) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

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
    if (_detectNode2['default']) return false;

    if (typeof BroadcastChannel === 'function') return true;
};