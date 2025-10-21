

class FrostyStore<T> {
    private state: T;
    private subscriptions: ((state: T) => void)[] = [];

    constructor(initialState: T) {
        this.state = initialState;
        Object.freeze(this.state);
    }

    public update(updatedState: Partial<T>): void {
        this.state = {
            ...this.state,
            ...updatedState
        }
        Object.freeze(this.state);
        this.subscriptions.forEach(fn => {
            fn(this.data);
        });
    }

    public get data() : Readonly<T> {
        return Object.freeze(structuredClone(this.state));
    }

    public getFromKey<Key extends keyof T>(key: Key): Readonly<{ [key]: T[Key]; }> {
        const p = { [key]: this.state[key] };
        return Object.freeze(p);
    }

    public subscribe(fn: (state: T) => void) {
        this.subscriptions.push(fn);
    }
}

export function createStore<T>(initialState: T): FrostyStore<T> {
    return new FrostyStore<T>(initialState);
}

