import { nanoid } from 'nanoid';

class FrostyStore<T> {
    private storeId: string;
    private state: T;
    private subscriptions: Map<string, (state: T) => void>;

    constructor(initialState: T) {
        this.storeId = nanoid();
        this.subscriptions = new Map<string, (state: T) => void>();
        this.state = initialState;
        Object.freeze(this.state);
    }

    public update(updatedState: Partial<T>): FrostyStore<T> {
        this.state = {...this.state, ...updatedState}
        Object.freeze(this.state);
        this.subscriptions.forEach(cb => cb(this.data));
        return this;
    }

    public get data() : Readonly<T> {
        return structuredClone(this.state);
    }

    public getFromKey<Key extends keyof T>(key: Key): T[Key] {
        return structuredClone(this.state[key]);
    }

    public subscribe(cb: (state: T) => void): () => Readonly<{ origin: string, id: string }> {
        const id = nanoid(31);
        this.subscriptions.set(id, cb);
        const susbcription = Object.freeze({ id, origin: this.storeId });
        return () => susbcription;
    }

    public unsubscribe(subscriptionFn: () => Readonly<{ origin: string, id: string }>): boolean {
        const metadata = subscriptionFn();
        return this.storeId === metadata.origin && this.subscriptions.delete(metadata.id);
    }
}

export function createStore<T>(initialState: T): FrostyStore<T> {
    return new FrostyStore<T>(initialState);
}

