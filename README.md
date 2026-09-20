# Frosty 🧊

**A lightweight, immutable, and type-safe global state management library for TypeScript.**

`v1.0.0` · [MIT licensed](./LICENSE)

Frosty provides a fast, predictable state container with zero boilerplate. It combines the simplicity of a basic pub/sub store with strict immutability and deep-merging, while keeping your bundle size tiny.

## Features

- **Zero-Cost Reads**: `store.data` and `store.getFromKey()` return direct references to the frozen internal state — no cloning, no serialization, on every read.
- **Deep Partial Updates**: Update deeply nested properties without wiping out sibling data.
- **Immutability**: State is deeply frozen. Attempting to mutate it throws a `TypeError`, catching bugs at the exact moment they happen.
- **Serializable by Design**: Enforces plain, JSON-compatible data structures — no `Date`, `Map`, `Set`, class instances, or functions — to guarantee 100% predictability and easy persistence.
- **Structural Sharing**: Branches of the state tree you don't touch in an update are reused, not recreated.
- **TypeScript First**: Built from the ground up with strict typing and `DeepPartial` support.

## Requirements

Frosty relies on [`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) internally to guarantee immutability without leaking references back to your own code. This means:

- **Node.js 18+** (or Node 17 with the global available — 18 LTS is the safe baseline).
- Any reasonably modern browser (all evergreen browsers support it; no IE support).

On unsupported runtimes, Frosty will throw `ReferenceError: structuredClone is not defined` rather than failing silently.

## Installation

> Install directly from the repo:
> ```bash
> npm install github:alkemist-17/frosty
> ```

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

Creates a new store instance. `initialState` is validated (see [Serializable State Only](#2-serializable-state-only)), deep-cloned, and deeply frozen — so mutating the object you passed in *after* calling `createStore` has no effect on the store, and vice versa.


```typescript
store.data: Readonly<T>
```

Returns the current state.

*Note: This returns a direct reference to the deeply frozen internal state — reads are O(1), with no cloning cost. Attempting to mutate the returned value will throw a **TypeError**.*


```typescript
store.getFromKey<Key extends keyof T>(key: Key): T[Key]
```

Retrieves a specific root-level property from the state. Useful for extracting a slice of state without reading the entire tree. The returned value is part of the same frozen state tree as `store.data`, so it is also immutable at runtime — mutating it throws, even though the type signature doesn't wrap it in `Readonly<>`.


```typescript
store.update(partialState: DeepPartial<T>): FrostyStore<T>
```

Merges the provided partial state into the current state.

- Supports deeply nested updates without requiring you to reconstruct parent objects.
- Arrays are replaced, not merged (see below).
- The `partialState` argument is validated and deep-cloned before merging, so mutating the object you passed in *after* calling `update()` never affects the store.
- Returns the store instance, allowing for chained updates.
- Throws if `partialState` contains a non-serializable value (see [Serializable State Only](#2-serializable-state-only)).


```typescript
store.subscribe(callback: (state: T) => void): Subscription
```

Registers a listener that fires synchronously with the new state whenever `update()` is called. Returns a `Subscription` object.

> ⚠️ **Subscriber errors are not isolated.** If a callback throws, iteration over the remaining subscribers stops immediately — later-registered subscribers will not be notified for that update, and the exception propagates out of the `update()` call that triggered it. Wrap your own callback logic in `try/catch` if a single failure in your handler shouldn't take down the rest of your app's update cycle.


```typescript
subscription.unsubscribe(): void
```

Removes the listener from the store. Always call this when your component or module unmounts to prevent memory leaks.

### Exported types

```typescript
import { createStore, DeepPartial, Subscription } from 'frosty';
```

- `DeepPartial<T>` — the type accepted by `update()`; every property at every depth is optional. Useful if you're building your own helper functions around partial state.
- `Subscription` — the object returned by `subscribe()`, with a readonly `id` and an `unsubscribe()` method. Useful for typing a variable or class field that holds a subscription.


## Frosty Design Principles

To guarantee predictability and performance, Frosty enforces a few strict rules. Understanding these will help you get the most out of the library.


### 1. Immutability

Frosty deeply freezes the state tree. If you try to mutate the state directly, JavaScript will throw a **TypeError** in strict mode.

```typescript
const state = store.data;
state.user.name = "Bob"; // ❌ TypeError: Cannot assign to read only property 'name'
```

*Important: Always use `store.update()` to change state.*


### 2. Serializable State Only

To prevent subtle bugs caused by JavaScript's internal object slots — and to keep state trivially persistable and DevTools-friendly — Frosty rejects non-serializable values: **`Date`, `Map`, `Set`, `RegExp`, custom class instances, and functions.**

```typescript
createStore({ createdAt: new Date() });     // ❌ Throws Error
store.update({ onClick: () => {} });        // ❌ Throws Error
```

**The Frosty Way**: Store dates as ISO strings or timestamps, sets as arrays, and so on — instantiate richer types (like `Date` or `Set`) only in your UI/view layer, from the plain data Frosty gives you. This guarantees your state is always 100% JSON-compatible.


### 3. Arrays are Replaced, Not Merged

When you update an array, the old array is completely replaced by the new one — array elements are not merged index-by-index.

```typescript
store.update({ notifications: ['New Alert'] });
// The old notifications array is gone, replaced entirely by ['New Alert']
```


## Performance

Frosty is designed around one asymmetry: **reads should be free, writes should cost proportionally to what you're writing.**

- **Reads are zero-cost.** `store.data` and `getFromKey()` return a direct reference into the frozen state tree — no cloning, no traversal cost beyond a plain property access, regardless of how large the rest of the state tree is.
- **Writes cost proportionally to the size of the payload you pass to `update()`, not the size of the whole state tree.** `update()` deep-clones its `partialState` argument (this is what guarantees mutating your own object afterward can't corrupt the store — see [Immutability](#1-immutability)). A small nested update stays sub-millisecond even against a large state tree, because untouched branches are structurally shared, not copied. A large payload — for example, replacing a 10,000-item array in one `update()` call — pays a cloning cost proportional to that array's size, since the whole payload has to be cloned before it can be safely frozen.

We don't publish fixed millisecond numbers here, because they vary by hardware, Node version, and — more importantly — by the exact shape of your state and payloads. The project includes a benchmark suite (`frosty.test.ts`) that exercises a 10,000-user nested state tree; run it yourself for numbers representative of your environment:

```bash
npm test
```

As a rough point of reference from one run on a modern machine: initializing a 10,000-user tree and deep-freezing it takes tens of milliseconds; a single nested-property update on that same tree stays well under a millisecond thanks to structural sharing; replacing the entire 10,000-item array in one `update()` call takes tens of milliseconds, dominated by the clone. If your workload leans heavily on replacing large arrays on every update, that's the cost curve to be aware of — small, targeted updates stay cheap regardless of total state size.

---

Need some new feature? Just drop a line.