declare class FrostyStore<T> {
    private state;
    private subscriptions;
    constructor(initialState: T);
    update(updatedState: Partial<T>): void;
    get data(): Readonly<T>;
    getFromKey<Key extends keyof T>(key: Key): Readonly<{}>;
    subscribe(fn: (state: T) => void): void;
}
export declare function createStore<T>(initialState: T): FrostyStore<T>;
export {};
//# sourceMappingURL=frosty.d.ts.map