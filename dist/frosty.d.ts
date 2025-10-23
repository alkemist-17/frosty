declare class FrostyStore<T> {
    private storeId;
    private state;
    private subscriptions;
    constructor(initialState: T);
    update(updatedState: Partial<T>): FrostyStore<T>;
    get data(): Readonly<T>;
    getFromKey<Key extends keyof T>(key: Key): T[Key];
    subscribe(cb: (state: T) => void): () => Readonly<{
        origin: string;
        id: string;
    }>;
    unsubscribe(subscriptionFn: () => Readonly<{
        origin: string;
        id: string;
    }>): boolean;
}
export declare function createStore<T>(initialState: T): FrostyStore<T>;
export {};
//# sourceMappingURL=frosty.d.ts.map