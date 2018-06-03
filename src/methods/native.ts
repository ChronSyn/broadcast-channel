import BroadcastChannelMethod from '../typings/broadcast-channel-method.interface';

declare type NativeInstance = {
    bc: any
};

const window2: any = window || {};



const NativeMethod: BroadcastChannelMethod<NativeInstance> = {
    get type(): string {
        return 'native'
    },
    async create(name: string): Promise<NativeInstance> {
        const bc = new window2.BroadcastChannel(name);
        return { bc };
    },
    async postMessage(
        instance: NativeInstance,
        msg: any
    ): Promise<void> {
        instance.bc.postMessage(msg);
    },
    async close(
        instance: NativeInstance
    ) {
        instance.bc.close();
    },
    onmessage(
        instance: NativeInstance,
        fn: Function
    ) {
        instance.bc.onmessage = fn;
    },
    onmessageerror(
        instance: NativeInstance,
        fn: Function
    ) {
        instance.bc.onmessage = fn;
    },
    canBeUsed(): boolean {
        if (typeof window !== 'undefined' && window['BroadcastChannel']) {
            return true;
        } else {
            return false;
        }
    }
}

export default NativeMethod;