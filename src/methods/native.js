import isNode from 'detect-node';


export const type = 'native';

export function create(channelName, options = {}) {
    const state = {
        channelName,
        options,
        messagesCallback: null,
        bc: new window.BroadcastChannel(channelName),
        subscriberFunctions: []
    };

    state.bc.onmessage = msg => {
        if (state.messagesCallback) {
            state.messagesCallback(msg.data);
        }
    };

    return state;
};

export function close(channelState) {
    channelState.bc.close();
    channelState.subscriberFunctions = [];
}

export function postMessage(channelState, messageJson) {
    channelState.bc.postMessage(messageJson, false);
}

export function onMessage(channelState, fn, time) {
    channelState.messagesCallbackTime = time;
    channelState.messagesCallback = fn;
}

export function canBeUsed() {
    if (isNode) return false;

    if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function')
        return true;
};
