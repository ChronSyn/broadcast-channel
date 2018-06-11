declare type MethodType = 'node' | 'idb' | 'native';

export type BroadcastChannelOptions = {
    type?: MethodType,
    prepareDelay?: number,
    node?: {
        ttl?: number
    },
    idb?: {
        ttl?: number
    }
};

/**
 * api as defined in
 * @link https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
 */
declare class BroadcastChannel {
    constructor(name: string, opts?: BroadcastChannelOptions);
    readonly name: string;
    readonly options: BroadcastChannelOptions;
    readonly type: MethodType;

    postMessage(msg: any): Promise<void>;
    close(): Promise<void>;

    onmessage(fn: (msg: any) => void);
}

export default BroadcastChannel;
