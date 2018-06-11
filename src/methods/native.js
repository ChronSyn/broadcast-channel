import isNode from 'detect-node';


export const type = 'native';

export async function create(channelName, options = {}) {
    const state = {
        channelName,
        options,
        bc: new window.BroadcastChannel(channelName),
        subscriberFunctions: []
    };

    state.bc.onmessage = msg => {
        state.subscriberFunctions.forEach(fn => fn(msg.data));
    };

    return state;
};

export function close(channelState) {
    channelState.bc.close();
    channelState.subscriberFunctions = [];
}

export async function postMessage(channelState, messageJson) {
    channelState.bc.postMessage(messageJson);
}

export function onMessage(channelState, fn) {
    channelState.subscriberFunctions.push(fn);
}

export function canBeUsed() {
    if (isNode) return false;

    if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function')
        return true;
};
