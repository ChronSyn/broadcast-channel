import Options from './options';

/**
 * api as defined in
 * @link https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
 */
declare class BroadcastChannel {
    constructor(name: string, opts: Options);
    readonly name: string;

    postMessage(msg: any): void;
    close(): void;

    // TODO set onmessage(fn: (ev: Event) => void);
    // TODO set onmessageerror(fn: (ev: Event) => void);
}

export default BroadcastChannel;
