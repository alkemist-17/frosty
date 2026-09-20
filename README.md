# Frosty 🧊

**A lightweight, immutable, and type-safe global state management library for TypeScript.**

`v1.0.0`

Frosty provides a blazing-fast, predictable state container with zero boilerplate. It combines the simplicity of a basic pub/sub store with the strict immutability and deep-merging capabilities of enterprise-grade state managers, all while keeping your bundle size tiny.

## Features

- **Zero-Cost Reads**: Access state instantly without expensive cloning or serialization.
- **Deep Partial Updates**: Update deeply nested properties without wiping out sibling data.
- **Immutability**: State is deeply frozen. Attempting to mutate it throws a `TypeError`, catching bugs at the exact moment they happen.
- **Serializable by Design**: Enforces plain, JSON-compatible data structures to guarantee 100% predictability and DevTools compatibility.
- **Structural Sharing**: Only the parts of the state tree that actually change are recreated in memory, keeping updates incredibly fast.
- **TypeScript First**: Built from the ground up with strict typing and `DeepPartial` support.

---

## Quick Start

```typescript
import { createStore } from 'frosty';

// 1. Define your state shape
interface AppState {
  user: { name: string; preferences: { theme: 'light' | 'dark' } } | null;
  notifications: string[];
}

// 2. Create the store
const store = createStore<AppState>({
  user: null,
  notifications: []
});

// 3. Read state (Zero-cost reference return)
console.log(store.data.user); // null

// 4. Update state (Deep partial merge)
store.update({
  user: {
    name: 'Alice',
    preferences: { theme: 'dark' } // You don't need to provide the whole object!
  }
});

// 5. Subscribe to changes
const subscription = store.subscribe((state) => {
  console.log('Theme changed to:', state.user?.preferences.theme);
});

store.update({ user: { preferences: { theme: 'light' } } }); 
// Logs: "Theme changed to: light"

// 6. Clean up
subscription.unsubscribe();

```

## API Reference

```typescript
createStore<T>(initialState: T): FrostyStore<T>
```

Creates a new store instance. The initial state is immediately deep-cloned and frozen to prevent external mutation.


```typescript
store.data: Readonly<T>
```

Returns the current state.

*Note: This returns a direct reference to the deeply frozen internal state. It is highly optimized (O(1)), but attempting to mutate it will throw a **TypeError**.*


```typescript
store.getFromKey<K>(key: K): Readonly<T[K]>
```


Retrieves a specific root-level property from the state. Useful for extracting a slice of state without reading the entire tree.


```typescript
store.update(partialState: DeepPartial<T>): FrostyStore<T>
```


Merges the provided partial state into the current state.

- Supports deeply nested updates without requiring you to reconstruct parent objects.
- Arrays are replaced, not merged.
- Returns the store instance, allowing for chained updates.


```typescript
store.subscribe(callback: (state: T) => void): Subscription
```


Registers a listener that fires whenever the state changes. Returns a Subscription object.


```typescript
subscription.unsubscribe(): void
```


Removes the listener from the store. Always call this when your component or module unmounts to prevent memory leaks.


## Frosty Design Principles

To guarantee absolute predictability and performance, Frosty enforces a few strict rules. Understanding these will help you get the most out of the library.


### 1. Immutability
Frosty deeply freezes the state tree. If you try to mutate the state directly, JavaScript will throw a **TypeError** in strict mode.


```typescript
const state = store.data;
state.user.name = "Bob"; // ❌ TypeError: Cannot assign to read only property 'name'
```


*Important Note: Always use store.update() to change state.*


### 2. Serializable State Only
To prevent subtle bugs caused by JavaScript's internal object slots, Frosty rejects non-serializable objects like **Date, Map, Set, and custom class instances**.


```typescript
createStore({ createdAt: new Date() }); // ❌ Throws Error
```



**The Frosty Way**: Store dates as ISO strings or timestamps, and other data types in its best serializable representation accordingly. Instantiate, for example, Date or Set objects only in your UI/view layer when needed. This guarantees your state is always 100% JSON-compatible, making persistence trivial.


### 3. Arrays are Replaced, Not Merged
When you update an array, the old array is completely replaced by the new one.


```typescript
store.update({ notifications: ['New Alert'] }); 
// The old notifications array is gone, replaced entirely by ['New Alert']
```



## Performance
Frosty is built for high-frequency updates and massive state trees. By utilizing structural sharing and zero-cost reads, it avoids heavy serialization penalties.


### Benchmarks (10,000 complex nested objects):

- Initialization & Deep Freeze
~21 ms
- 100,000x State Reads
~2 ms
- Deep Nested Update
~0.04 ms
- Replace 10,000 item Array
~14 ms
- Notify 1,000 Subscribers
~0.8 ms




Need some new feature? Just drop a line.

