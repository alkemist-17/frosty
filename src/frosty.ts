import { nanoid } from 'nanoid';


/**
 * Recursively makes all properties of T optional, including nested objects.
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;


// Interface Subscription
export interface Subscription {
  readonly id: string;
  readonly origin: string;
  unsubscribe: () => void;
}


// Class FrostyStore represents the immutable store.
class FrostyStore<T extends object> {
    private readonly storeId: string;
    private state: T;
    private readonly subscriptions: Map<string, (state: T) => void>;

    constructor(initialState: T) {
        this.storeId = nanoid();
        this.subscriptions = new Map<string, (state: T) => void>();
        validateSerializable(initialState);
        this.state = this.deepFreeze(deepMerge({} as T, initialState));
    }

    private deepFreeze<U extends object>(obj: U): Readonly<U> {
        Object.freeze(obj);
        for (const key of Object.keys(obj)) {
            const value = (obj as Record<string, unknown>)[key];
            if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
                this.deepFreeze(value as object);
            }
        }
        return obj as Readonly<U>;
    }

    public update(updatedState: DeepPartial<T>): FrostyStore<T> {
        validateSerializable(updatedState);
        this.state = this.deepFreeze(deepMerge(this.state, updatedState as object));
        this.subscriptions.forEach(cb => cb(this.state));
        return this;
    }

    public get data() : Readonly<T> {
        return this.state;
    }

    public getFromKey<Key extends keyof T>(key: Key): T[Key] {
        return this.state[key];
    }

    public subscribe(cb: (state: T) => void): Subscription {
        const id = nanoid(31);
        this.subscriptions.set(id, cb);
        return {
            id,
            origin: this.storeId,
            unsubscribe: () => {
                this.subscriptions.delete(id);
            }
        } as Subscription;
    }

    public unsubscribe(subscriptionFn: () => Readonly<Subscription>): boolean {
        const metadata = subscriptionFn();
        return this.storeId === metadata.origin && this.subscriptions.delete(metadata.id);
    }
}


/**
 * Checks if a value is a plain object (not an array, null, Date, Map, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deeply merges a source object into a target object, returning a new object.
 * Arrays and non-plain objects (Dates, Maps, etc.) are replaced by reference.
 */
function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  // Create a shallow copy of the target to avoid mutation
  const output = { ...target } as T & U;

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key of Object.keys(source)) {
      const sourceValue = (source as Record<string, unknown>)[key];
      const targetValue = (output as Record<string, unknown>)[key];

      if (isPlainObject(sourceValue)) {
        if (isPlainObject(targetValue)) {
          // Both are plain objects: merge recursively
          (output as Record<string, unknown>)[key] = deepMerge(targetValue, sourceValue);
        } else {
          // Target is not an object (or is undefined/null), but source is: 
          // initialize with an empty object and merge
          (output as Record<string, unknown>)[key] = deepMerge({} as Record<string, unknown>, sourceValue);
        }
      } else {
        // Source is a primitive, array, null, or special object: overwrite directly
        (output as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return output;
}


function validateSerializable(obj: unknown, path: string = "root"): void {
  if (obj === null || typeof obj !== "object") return;

  // Block built-in mutable objects
  if (obj instanceof Date || obj instanceof Map || obj instanceof Set || obj instanceof RegExp) {
    throw new Error(
      `FrostyStore only supports plain, serializable objects. Found non-serializable type '${obj.constructor.name}' at path '${path}'. ` +
      `Use strings, numbers, booleans, plain objects, or arrays instead.`
    );
  }

  // Block custom class instances
  if (Object.getPrototypeOf(obj) !== Object.prototype && !Array.isArray(obj)) {
    throw new Error(
      `FrostyStore only supports plain objects. Found class instance '${obj.constructor.name}' at path '${path}'.`
    );
  }

  // Recursively check all nested properties
  for (const key of Object.keys(obj)) {
    validateSerializable((obj as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
  }
}

export function createStore<T extends object>(initialState: T): FrostyStore<T> {
    return new FrostyStore<T>(initialState);
}

