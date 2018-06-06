import NodeMethod from './methods/node';
// order is important
let METHODS = [
    NodeMethod
];

class BroadcastChannel {
    constructor(name, options) {
        this.name = name;
        this.options = options;
        this.method = getFirstUseableMethod();

        this._preparePromise = this._prepare();
    }
    async _prepare() {
        if (this._preparePromise) return this._preparePromise;
        this.methodInstance = await this.method.create(this.name, this.options);
    }
    async postMessage(msg) {
        if (this.closed) {
            throw new Error(
                'BroadcastChannel.postMessage(): ' +
                'Cannot post message after channel has closed'
            );
        }
        await this._preparePromise;
        await this.method.postMessage(
            this.methodInstance,
            msg
        );
    }
    set onmessage(fn) {
        this._preparePromise.then(() => {
            this.method.onmessage(
                this.methodInstance,
                fn
            );
        });
    }
    async close() {
        this.closed = true;
        await this.method.close(
            this.methodInstance
        );
    }
    get type() {
        return this.method.type;
    }
};

function getFirstUseableMethod() {
    const useMethod = METHODS.find(method => method.canBeUsed());
    if (!useMethod)
        throw new Error('No useable methode found:' + JSON.stringify(METHODS.map(m => m.type)));
    else
        return useMethod;
}

export default BroadcastChannel;
