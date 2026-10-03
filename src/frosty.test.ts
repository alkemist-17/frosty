import { describe, it, expect, vi } from 'vitest';
import { createStore } from './frosty.js';

describe('Frosty Store', () => {
  describe('Happy Paths', () => {
    it('should create a store with valid initial state', () => {
      const initialState = { count: 0, name: 'Frosty', active: true };
      const store = createStore(initialState);
      expect(store.getState()).toEqual({ count: 0, name: 'Frosty', active: true });
    });

    it('should create a store with valid initial state and different from the initial state object', () => {
      const initialState = { count: 0, name: 'Frosty', active: true };
      const store = createStore(initialState);
      expect(store.getState()).toEqual({ count: 0, name: 'Frosty', active: true });
      expect(store.getState()).toEqual(initialState);
      expect(initialState === store.getState()).toBeFalsy();
    });

    it('should update the store state correctly', () => {
      const store = createStore({ count: 0 });
      store.update(state => ({ count: state.count + 1 }));
      expect(store.getState().count).toBe(1);
    });

    it('should query the store state correctly', () => {
      const store = createStore({ user: { name: 'Alice', age: 30 } });
      const name = store.query(state => state.user.name);
      expect(name).toBe('Alice');
    });

    it('should subscribe and notify listeners on update, and allow unsubscription', () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      
      store.update(state => ({ count: 1 }));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ count: 1 });
      
      unsubscribe();
      store.update(state => ({ count: 2 }));
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Border Cases', () => {
    it('should map undefined to null in initial state (nested and root level)', () => {
      const store = createStore({ a: undefined, b: { c: undefined } } as any);
      expect(store.getState()).toEqual({ a: null, b: { c: null } });
    });

    it('should map undefined to null in updated state', () => {
      const store = createStore({ a: 1 });
      store.update(() => ({ a: undefined } as any));
      expect(store.getState()).toEqual({ a: null });
    });

    it('should handle empty objects and arrays and freeze them', () => {
      const store = createStore({ arr: [], obj: {} });
      expect(store.getState()).toEqual({ arr: [], obj: {} });
      expect(Object.isFrozen(store.getState().arr)).toBe(true);
      expect(Object.isFrozen(store.getState().obj)).toBe(true);
    });

    it('should recreate arrays and objects recursively on update (even if reference is reused)', () => {
      const initial = { arr: [1, { nested: 2 }] };
      const store = createStore(initial);
      
      // Deliberately returning the same reference
      store.update(state => ({ arr: state.arr }));
      
      const newState = store.getState();
      expect(newState.arr).not.toBe(initial.arr); // Array recreated
      expect(newState.arr[1]).not.toBe(initial.arr[1]); // Nested object recreated
      expect(newState.arr).toEqual([1, { nested: 2 }]);
    });
  });

  describe('Adversary Programming', () => {
    it('should throw if root entity is not a plain object', () => {
      expect(() => createStore(null as any)).toThrow("The Store's root entity must be of type object.");
      expect(() => createStore([] as any)).toThrow("The Store's root entity must be of type object, not array.");
      expect(() => createStore("string" as any)).toThrow("The Store's root entity must be of type object.");
      expect(() => createStore(123 as any)).toThrow("The Store's root entity must be of type object.");
    });

    it('should throw if root entity becomes non-object after update', () => {
      const store = createStore({ a: 1 });
      expect(() => store.update(() => null as any)).toThrow("The Store's root entity must be of type object.");
      expect(() => store.update(() => [] as any)).toThrow("The Store's root entity must be of type object, not array.");
    });

    it('should throw on non-serializable types in initial state', () => {
      expect(() => createStore({ date: new Date() } as any)).toThrow(/Unsupported data type/);
      expect(() => createStore({ map: new Map() } as any)).toThrow(/Unsupported data type/);
      expect(() => createStore({ set: new Set() } as any)).toThrow(/Unsupported data type/);
      expect(() => createStore({ func: () => {} } as any)).toThrow(/Unsupported data type/);
      expect(() => createStore({ sym: Symbol('test') } as any)).toThrow(/Unsupported data type/);
      expect(() => createStore({ bigint: BigInt(1) } as any)).toThrow(/Unsupported data type/);
    });

    it('should throw on objects with Symbol keys (non-serializable)', () => {
      const sym = Symbol('test');
      expect(() => createStore({ [sym]: 1 } as any)).toThrow(/Symbol keys are not serializable/);
    });

    it('should throw on circular references to prevent stack overflow / memory leaks', () => {
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;
      expect(() => createStore(circularObj)).toThrow(/Circular reference detected/);

      const circularArr: any = [1];
      circularArr.push(circularArr);
      expect(() => createStore({ arr: circularArr })).toThrow(/Circular reference detected/);
    });

    it('should prevent direct mutation of the state (strict immutability)', () => {
      const store = createStore({ a: 1, b: { c: 2 }, d: [3, 4] });
      const state = store.getState();
      
      // In strict mode, these assignments will throw TypeErrors
      expect(() => { (state as any).a = 2; }).toThrow();
      expect(() => { (state.b as any).c = 3; }).toThrow();
      expect(() => { (state.d as any).push(5); }).toThrow();
      
      expect(Object.isFrozen(state)).toBe(true);
      expect(Object.isFrozen(state.b)).toBe(true);
      expect(Object.isFrozen(state.d)).toBe(true);
    });

    it('should prevent reference leaks from external objects', () => {
      const externalObj = { x: 1 };
      const store = createStore({ ref: externalObj });
      
      const state = store.getState();
      expect(state.ref).not.toBe(externalObj); // Reference is broken (cloned)
      expect(state.ref).toEqual({ x: 1 });
      
      externalObj.x = 2;
      expect(state.ref.x).toBe(1); // Store state remains unaffected
    });

    it('should not corrupt state if updater function throws', () => {
      const store = createStore({ count: 0 });
      try {
        store.update(() => {
          throw new Error('Updater intentional failure');
        });
      } catch (e) {
        // Expected
      }
      expect(store.getState().count).toBe(0); // State remains pristine
    });

    it('should not break other subscribers if one subscriber throws', () => {
      const store = createStore({ count: 0 });
      const listener1 = vi.fn().mockImplementation(() => { throw new Error('Listener 1 error'); });
      const listener2 = vi.fn();
      
      store.subscribe(listener1);
      store.subscribe(listener2);
      
      // Suppress console.error for this specific test to keep test output clean
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      store.update(state => ({ count: 1 }));
      
      console.error = originalConsoleError; // Restore
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith({ count: 1 }); // Listener 2 still executes successfully
    });
  });
});