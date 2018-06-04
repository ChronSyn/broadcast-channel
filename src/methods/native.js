const NativeMethod = {
    get type() {
        return 'native';
    },
    async create(name) {
        const bc = new window2.BroadcastChannel(name);
        return {
            bc
        };
    },
    async postMessage(
        instance,
        msg
    ) {
        instance.bc.postMessage(msg);
    },
    async close(
        instance
    ) {
        instance.bc.close();
    },
    onmessage(
        instance,
        fn
    ) {
        instance.bc.onmessage = fn;
    },
    onmessageerror(
        instance,
        fn
    ) {
        instance.bc.onmessage = fn;
    },
    canBeUsed() {
        if (typeof window !== 'undefined' && window['BroadcastChannel'])
            return true;
        else
            return false;
    }
};

export default NativeMethod;
