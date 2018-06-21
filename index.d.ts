declare type MethodType = 'node' | 'idb' | 'native' | 'localstorage';

export type BroadcastChannelOptions = {
    type?: MethodType,
    webWorkerSupport?: boolean;
    prepareDelay?: number;
    node?: {
        ttl?: number;
    };
    idb?: {
        ttl?: number;
        fallbackInterval?: number;
    };
};

/**
 * api as defined in
 * @link https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
 */
declare class BroadcastChannel<T = any> {
    constructor(name: string, opts?: BroadcastChannelOptions);
    readonly name: string;
    readonly options: BroadcastChannelOptions;
    readonly type: MethodType;

    postMessage(msg: T): Promise<void>;
    close(): Promise<void>;

    onmessage: ((this: BroadcastChannel, ev: T) => any) | null;
}

export default BroadcastChannel;
