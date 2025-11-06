declare class Subscription {
    private readonly _id;
    private readonly _origin;
    constructor(_id: string, _origin: string);
    get id(): string;
    get origin(): string;
}
declare class FrostyStore<T> {
    private readonly storeId;
    private state;
    private readonly subscriptions;
    constructor(initialState: T);
    update(updatedState: Partial<T>): FrostyStore<T>;
    get data(): Readonly<T>;
    getFromKey<Key extends keyof T>(key: Key): T[Key];
    subscribe(cb: (state: T) => void): () => Readonly<Subscription>;
    unsubscribe(subscriptionFn: () => Readonly<Subscription>): boolean;
}
export declare function createStore<T>(initialState: T): FrostyStore<T>;
export {};
//# sourceMappingURL=frosty.d.ts.map