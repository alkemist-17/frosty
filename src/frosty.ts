export type Serializable = null | boolean | number | string | SerializableObject | SerializableArray;

export type SerializableObject = {
  [key: string]: Serializable;
};

export type SerializableArray = Serializable[];

export interface Store<T extends SerializableObject> {
  /**
   * Updates the Store's state using an updater function.
   * @param updater A function that receives the current state and returns the new state.
   */
  update(updater: (state: T) => T): void;

  /**
   * Queries the Store's state using a selector function.
   * @param selector A function that receives the current state and returns a derived value.
   */
  query<R>(selector: (state: T) => R): R;

  /**
   * Subscribes to the Store's state changes.
   * @param listener A function to be called when the state changes.
   * @returns An unsubscribe function.
   */
  subscribe(listener: (state: T) => void): () => void;

  /**
   * Returns the current state of the Store.
   */
  getState(): T;
}

function isPlainObject(value: any): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function deepSanitizeAndFreeze(value: any, isRoot: boolean = false, visited: WeakSet<any> = new WeakSet()): any {
  // 1. Map undefined to null as per specification
  if (value === undefined) {
    return null;
  }

  // 2. Handle primitives
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    if (isRoot) {
      throw new TypeError("The Store's root entity must be of type object.");
    }
    return value;
  }

  // 3. Handle Arrays
  if (Array.isArray(value)) {
    if (isRoot) {
      throw new TypeError("The Store's root entity must be of type object, not array.");
    }
    if (visited.has(value)) {
      throw new TypeError("Circular reference detected. Only acyclic serializable data is allowed.");
    }
    visited.add(value);
    
    // Recreates the array recursively, guaranteeing no reference leaks
    const newArr = value.map(item => deepSanitizeAndFreeze(item, false, visited));
    return Object.freeze(newArr);
  }

  // 4. Handle Plain Objects
  if (typeof value === 'object') {
    if (!isPlainObject(value)) {
      throw new TypeError(`Unsupported data type: ${Object.prototype.toString.call(value)}. Only plain objects, arrays, null, boolean, number, and string are allowed.`);
    }
    if (visited.has(value)) {
      throw new TypeError("Circular reference detected. Only acyclic serializable data is allowed.");
    }
    visited.add(value);

    // Prevent Symbol keys as they are not JSON serializable
    const symbolKeys = Object.getOwnPropertySymbols(value);
    if (symbolKeys.length > 0) {
      throw new TypeError("Objects with Symbol keys are not serializable and are not allowed.");
    }

    // Recreates the object recursively, guaranteeing no reference leaks
    const newObj: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      newObj[key] = deepSanitizeAndFreeze(value[key], false, visited);
    }
    return Object.freeze(newObj);
  }

  // 5. Reject all other types (Functions, Symbols, BigInt, Date, Map, Set, etc.)
  throw new TypeError(`Unsupported data type: ${typeof value}. Only plain objects, arrays, null, boolean, number, and string are allowed.`);
}

class FrostyStore<T extends SerializableObject> implements Store<T> {
  private state: T;
  private listeners: Set<(state: T) => void> = new Set();

  constructor(initialState: T) {
    this.state = deepSanitizeAndFreeze(initialState, true) as T;
  }

  update(updater: (state: T) => T): void {
    // Updater runs against current state. If it throws, state remains unchanged (safe).
    const newState = updater(this.state);
    
    // Enforces recursive recreation and deep freezing on every update
    this.state = deepSanitizeAndFreeze(newState, true) as T;
    this.notify();
  }

  query<R>(selector: (state: T) => R): R {
    return selector(this.state);
  }

  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): T {
    return this.state;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        // Prevents one faulty subscriber from breaking the store or other subscribers
        console.error('Frosty Store: Error in subscriber listener:', error);
      }
    }
  }
}

export function createStore<T extends SerializableObject>(initialState: T): Store<T> {
  return new FrostyStore(initialState);
}


