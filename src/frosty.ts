import { nanoid } from 'nanoid';

class Subscription {
    constructor(
        private readonly _id: string, 
        private readonly _origin: string
    ) {}
    public get id(): string {
        return this._id;
    }
    public get origin(): string {
        return this._origin;
    }
}

class FrostyStore<T> {
    private readonly storeId: string;
    private state: T;
    private readonly subscriptions: Map<string, (state: T) => void>;

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

    public subscribe(cb: (state: T) => void): () => Readonly<Subscription> {
        const id = nanoid(31);
        this.subscriptions.set(id, cb);
        const susbcription = Object.freeze(new Subscription(id, this.storeId));
        return () => susbcription;
    }

    public unsubscribe(subscriptionFn: () => Readonly<Subscription>): boolean {
        const metadata = subscriptionFn();
        return this.storeId === metadata.origin && this.subscriptions.delete(metadata.id);
    }
}

export function createStore<T>(initialState: T): FrostyStore<T> {
    return new FrostyStore<T>(initialState);
}

