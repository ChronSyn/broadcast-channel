declare interface BroadcastChannelMethod<MethodeInstance> {
    readonly type: string;
    create(name: string, options?: any): Promise<MethodeInstance>;
    postMessage(instance: MethodeInstance, msg: any): Promise<void>;
    close(instance: MethodeInstance): Promise<void>;

    onmessage(
        instance: MethodeInstance,
        fn: Function
    );
    onmessageerror(
        instance: MethodeInstance,
        fn: Function
    );

    /**
     * checks if this method can be used,
     * returns true if yes
     */
    canBeUsed(): boolean;
}

export default BroadcastChannelMethod;