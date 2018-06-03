import BroadcastChannelMethod from './typings/broadcast-channel-method.interface';
import Options from './typings/options';

let METHODS: BroadcastChannelMethod<any>[] = [];

export function addMethod(method: BroadcastChannelMethod<any>): void {
    METHODS.push(method);
}

export function clearMethods(): void {
    METHODS = [];
}

class BroadcastChannel {
    readonly name: string;
    private options: Options;
    private method: BroadcastChannelMethod<any>;
    private preparePromise: Promise<void>;
    private methodInstance!: any;
    private closed: boolean = false;
    constructor(name: string, options: Options) {
        this.name = name;
        this.options = options;
        this.method = getFirstUseableMethod();

        this.preparePromise = this._prepare();
    }

    private async _prepare() {
        this.methodInstance = await this.method.create(this.name, this.options);
    }

    async postMessage(msg: any): Promise<void> {
        if (this.closed) {
            throw new Error(
                'BroadcastChannel.postMessage(): ' +
                'Cannot post message after channel has closed'
            );
        }
        await this.method.postMessage(
            this.methodInstance,
            msg
        );
    }

    async close(): Promise<void> {
        this.closed = true;
        await this.method.close(
            this.methodInstance
        );
    }

    get type(): string {
        return this.method.type;
    };
};


function getFirstUseableMethod(): BroadcastChannelMethod<any> {
    let useMethod: BroadcastChannelMethod<any> | null = null;
    for (const method of METHODS) {
        if (!useMethod && method.canBeUsed()) {
            useMethod = method;
        }
    }

    if (!useMethod) {
        throw new Error('No useable methode found:' + METHODS.map(m => m.type));
    } else {
        return useMethod;
    }
}


export default BroadcastChannel;