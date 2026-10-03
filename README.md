# ❄️ Frosty

**Frosty** is a lightweight, immutable, and type-safe TypeScript store for managing application state. Designed with predictability and serialization in mind, Frosty ensures your state remains pure, leak-free, and ready for persistence at all times.

## 📦 Installation

```

   npm install @alkemist-17/frosty

```

## 🚀 Starter Example

```typescript
import { createStore } from 'frosty';

// 1. Define your state shape using type keyword
type AppState = {
  user: { name: string; age: number } | null;
  theme: 'light' | 'dark';
  loginAttempts: number;
}

// 2. Create the store with an initial state
const store = createStore<AppState>({
  user: null,
  theme: 'light',
  loginAttempts: 0,
});

// 3. Subscribe to state changes
const unsubscribe = store.subscribe((state) => {
  console.log('State updated:', state.theme);
});

// 4. Update the state immutably
store.update((state) => ({
  ...state,
  theme: 'dark',
  loginAttempts: state.loginAttempts + 1,
}));

// 5. Query specific slices of state
const currentTheme = store.query((state) => state.theme);
console.log('Current theme:', currentTheme); // Output: 'dark'

// 6. Clean up subscriptions when no longer needed
unsubscribe();

```

## 📖 API Reference

Frosty exposes a minimal, focused API to keep your state management predictable and easy to reason about.

```typescript
createStore<T>(initialState: T): Store<T>
```

Initializes a new Frosty store. The `initialState` must be a plain JavaScript object. During initialization, the state is deeply sanitized (e.g., `undefined` is mapped to `null`) and recursively frozen to guarantee immutability.


```typescript
store.update(updater: (state: T) => T): void
```

Updates the store's state. The `updater` function receives the current state and must return a new state object. Frosty will automatically deep-clone, sanitize, and freeze the returned state, preventing any accidental reference leaks or mutations. If the updater throws an error, the store's state remains unchanged.


```typescript
store.query<R>(selector: (state: T) => R): R
```

Synchronously derives and returns a value from the current state. This is the recommended way to read specific slices of data without exposing the entire state tree to the caller.


```typescript
store.subscribe(listener: (state: T) => void): () => void
```

Registers a callback function to be invoked whenever the store's state is successfully updated. Returns an `unsubscribe` function to remove the listener and prevent memory leaks. *Note: If a listener throws an error, it is caught and logged, ensuring other subscribers continue to function normally*.

```typescript
store.getState(): T
```

Returns the current, deeply frozen state of the store. Use this sparingly; `store.query()` is generally preferred for reading data.


## ⚖️ Key Advantages & Disadvantages

Understanding the architectural choices of Frosty will help you determine if it is the right fit for your project.


### ✅ Key Advantages

1. **Immutability**: Every update recursively recreates arrays and objects, and applies `Object.freeze()` at every level. Accidental mutations are caught immediately at runtime.

2. **Serializability**: Frosty actively rejects non-serializable types (e.g., `Date`, `Map`, `Set`, `Function`, `Symbol`). This prevents reference leaks to external systems and makes the state instantly ready for persistence (e.g., `localStorage`, IndexedDB, or server sync).

3. **First-Class TypeScript Support**: Fully typed generics ensure end-to-end type safety for initial state, updates, queries, and subscriptions without requiring complex boilerplate.

4. **Zero Dependencies**: Frosty is lightweight, adding negligible bundle size to your application.

5. **Resilient Architecture**: Updater errors do not corrupt the existing state, and subscriber errors do not break the notification chain for other listeners.


### ⚠️ Key Disadvantages

1. **Performance Overhead on Large Trees**: Because Frosty deeply clones and freezes the *entire* state tree on every update, it is not optimized for massive, deeply nested state objects that update at high frequency (e.g., 60fps animation data). For such cases, consider fine-grained reactive stores (like Zustand or Jotai).

2. **Strict Type Restrictions**: You cannot store class instances, Dates, Maps, Sets, or functions in the store. While this is a deliberate design choice for serializability, it requires developers to adapt their data modeling (e.g., storing ISO date strings instead of `Date` objects). Also, your data schema must be declared using `type` to use the the createStore function this way: `createStore<AppState>(...)` or you can declare your data schema using the keyword `interface`, in such case, you must use the create function this way: `createStore(...)` without indicating the parametric data type to the function.

3. **No Built-in Middleware**: Unlike Redux, Frosty does not have a middleware system for logging, devtools, or async thunks out of the box. Async logic should be handled externally, calling `store.update()` when resolved.

4. **No Automatic Memoization**: The `query` method runs the selector function on every call. For expensive derivations on large datasets, you should implement your own memoization (e.g., using reselect or lodash.memoize).


### 📜 License
Frosty is open-source software licensed under the MIT License.


### 🤝 Contributing
Contributions, issues, and feature requests are welcome! Please ensure you run the test suite (`npm run test`) and adhere to the existing TypeScript guidelines before submitting a pull request.
