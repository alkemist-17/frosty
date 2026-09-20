import { createStore, DeepPartial } from "./frosty";

// ============================================================================
// 1. TEST INFRASTRUCTURE
// ============================================================================

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error: any) {
    console.error(`❌ ${name}`);
    console.error(`   ↳ ${error.message}`);
    failed++;
  }
}

function expectThrow(fn: () => void, errorMsg: string = "Expected function to throw") {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  if (!threw) throw new Error(errorMsg);
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ============================================================================
// 2. TYPES & DATA GENERATORS
// ============================================================================

interface User {
  id: number;
  name: string;
  roles: string[];
  profile: { avatar: string; bio: string | null };
}

interface Settings {
  theme: "light" | "dark";
  notifications: { email: boolean; sms: boolean; push: boolean };
}

interface AppState {
  users: User[];
  settings: Settings;
  metadata: {
    createdAt: string; // Date ISO string.
    tags: string[]; // Simulating data like Set<string> for example.
    version: number;
  };
}

function generateUser(id: number): User {
  return {
    id,
    name: `User ${id}`,
    roles: id % 2 === 0 ? ["admin"] : ["user"],
    profile: { avatar: `url_${id}`, bio: id % 3 === 0 ? null : `Bio ${id}` },
  };
}

function generateHeavyState(userCount: number): AppState {
  return {
    users: Array.from({ length: userCount }, (_, i) => generateUser(i)),
    settings: {
      theme: "light",
      notifications: { email: true, sms: false, push: true },
    },
    metadata: {
      createdAt: (new Date("2026-01-01")).toISOString(),
      tags: ["alpha", "beta"],
      version: 1,
    },
  };
}

// ============================================================================
// 3. BASIC FUNCTIONALITY & DEEP MERGE TESTS
// ============================================================================

console.log("\n--- 🟢 Basic Functionality & Deep Merge ---");

test("Initial state is correctly stored and readable", () => {
  const store = createStore<AppState>(generateHeavyState(10));
  assertEqual(store.data.users.length, 10);
  assertEqual(store.data.settings.theme, "light");
});

test("Shallow update merges correctly", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  store.update({ settings: { theme: "dark", notifications: { email: false, sms: true, push: false } } });
  
  assertEqual(store.data.settings.theme, "dark");
  assertEqual(store.data.settings.notifications.email, false);
  assertEqual(store.data.users.length, 5); // Unrelated state untouched
});

test("Deep partial update merges nested objects without wiping siblings", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  
  // Only updating 'email', should not wipe 'sms' or 'push'
  store.update({ settings: { notifications: { email: false } } as DeepPartial<Settings> });
  
  assertEqual(store.data.settings.notifications.email, false);
  assertEqual(store.data.settings.notifications.sms, false); // Original value
  assertEqual(store.data.settings.notifications.push, true); // Original value
});

test("Arrays are replaced, not merged", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  const newUsers = [generateUser(99)];
  
  store.update({ users: newUsers });
  
  assertEqual(store.data.users.length, 1);
  assertEqual(store.data.users[0]!.id, 99);
});

test("Setting a nested property to null works correctly", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  store.update({ users: [{ ...generateUser(1), profile: { avatar: "x", bio: null } }] });
  
  assertEqual(store.data.users[0]!.profile.bio, null);
});

test("Chained updates work and return the store", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  const result = store
    .update({ settings: { theme: "dark" } as DeepPartial<Settings> })
    .update({ metadata: { version: 2 } as DeepPartial<AppState["metadata"]> });
    
  assertEqual(result, store);
  assertEqual(store.data.settings.theme, "dark");
  assertEqual(store.data.metadata.version, 2);
});

// ============================================================================
// 4. ADVERSARIAL TESTS ("MEAN USER" ATTACKS)
// ============================================================================

console.log("\n--- 🔴 Adversarial Tests (Immutability & Security) ---");

test("Attack 1: Direct mutation of store.data throws", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  
  expectThrow(() => {
    (store.data as any).settings.theme = "hacked";
  }, "Failed to block direct mutation of store.data");
  
  assertEqual(store.data.settings.theme, "light"); // State unchanged
});

test("Attack 2: Mutation of nested arrays throws", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  
  expectThrow(() => {
    (store.data.users as any).push(generateUser(999));
  }, "Failed to block array push mutation");
  
  expectThrow(() => {
    (store.data.users[0] as any).name = "Hacker";
  }, "Failed to block nested object mutation");
  
  assertEqual(store.data.users.length, 5);
});

test("Attack 3: Mutation of non-plain objects (Date/Set) throws", () => {
  // Attempting to create a store with a Date should throw immediately
  expectThrow(() => {
    createStore({ badDate: new Date() });
  }, "FrostyStore only supports plain, serializable objects");

  // Attempting to update with a Set should throw
  const store = createStore({ items: [] as string[] });
  expectThrow(() => {
    // We use 'as any' to bypass TS and simulate a runtime attack
    store.update({ items: new Set(["hacked"]) } as any);
  }, "FrostyStore only supports plain, serializable objects");

  // Attempting to use a custom class instance should throw
  class MyClass {}
  expectThrow(() => {
    createStore({ instance: new MyClass() });
  }, "FrostyStore only supports plain objects");
});

test("Attack 4: Mutating the object payload AFTER passing it to update doesn't affect store", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  const payload = { settings: { theme: "dark" as const, notifications: { email: false, sms: false, push: false } } };
  
  store.update(payload);
  
  // The "mean user" bypasses TS to mutate the original payload at runtime.
  // We use `as any` here intentionally to simulate a JS consumer or a deliberate 
  // attempt to corrupt shared references, which is exactly what we are defending against.
  (payload.settings as any).theme = "hacked";
  (payload.settings as any).notifications.email = true;
  
  // Store should be completely unaffected
  assertEqual(store.data.settings.theme, "dark");
  assertEqual(store.data.settings.notifications.email, false);
});

test("Attack 4b: Mutating an array payload AFTER passing it to update doesn't throw and doesn't affect store", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  const newUsers = [generateUser(99)];

  store.update({ users: newUsers });

  // Regression test: deepMerge used to assign arrays into the store's frozen
  // state BY REFERENCE, so deepFreeze would then freeze the caller's own
  // array. Mutating it afterward would throw a TypeError. It must not.
  let threwOnCallerArray = false;
  try {
    newUsers.push(generateUser(100));
  } catch {
    threwOnCallerArray = true;
  }
  if (threwOnCallerArray) {
    throw new Error("Caller's own array was frozen as a side effect of update() — reference leaked into the store");
  }

  // The caller's mutation must not have leaked into the store either.
  assertEqual(store.data.users.length, 1);
  assertEqual(store.data.users[0]!.id, 99);
});

test("Attack 5: Mutating objects returned from getFromKey throws", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  const settings = store.getFromKey("settings");
  
  expectThrow(() => {
    (settings as any).theme = "hacked";
  }, "Failed to block mutation of getFromKey result");
});

test("Attack 6: Functions in the payload are rejected", () => {
  const store = createStore<AppState>(generateHeavyState(5));

  expectThrow(() => {
    store.update({ onClick: () => {} } as any);
  }, "Failed to reject a function in the update payload");

  expectThrow(() => {
    createStore({ onClick: () => {} } as any);
  }, "Failed to reject a function in the initial state");
});

// ============================================================================
// 5. SUBSCRIPTION LIFECYCLE TESTS
// ============================================================================

console.log("\n--- 🟡 Subscription Lifecycle ---");

test("Subscribers are notified on update with the new state", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  const ref = { current: null as AppState | null};
  
  store.subscribe((state) => { ref.current = state; });
  store.update({ settings: { theme: "dark" } as DeepPartial<Settings> });
  
  if (!ref.current) throw new Error("Subscriber not called");
  assertEqual(ref.current.settings.theme, "dark");
});

test("Unsubscribing stops notifications", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  let callCount = 0;
  
  const sub = store.subscribe(() => { callCount++; });
  store.update({ metadata: { version: 2 } as DeepPartial<AppState["metadata"]> });
  assertEqual(callCount, 1);
  
  sub.unsubscribe();
  store.update({ metadata: { version: 3 } as DeepPartial<AppState["metadata"]> });
  assertEqual(callCount, 1); // Should not increase
});

test("Multiple subscribers receive updates independently", () => {
  const store = createStore<AppState>(generateHeavyState(5));
  let count1 = 0, count2 = 0;
  
  const sub1 = store.subscribe(() => { count1++; });
  store.subscribe(() => { count2++; });
  
  store.update({ metadata: { version: 2 } as DeepPartial<AppState["metadata"]> });
  assertEqual(count1, 1);
  assertEqual(count2, 1);
  
  sub1.unsubscribe();
  store.update({ metadata: { version: 3 } as DeepPartial<AppState["metadata"]> });
  assertEqual(count1, 1);
  assertEqual(count2, 2);
});

// ============================================================================
// 6. PERFORMANCE BENCHMARKS
// ============================================================================

console.log("\n--- ⚡ Performance Benchmarks ---");

const HEAVY_USER_COUNT = 10_000;
const heavyState = generateHeavyState(HEAVY_USER_COUNT);

// Benchmark 1: Store Creation & Initial Deep Freeze
let t0 = performance.now();
const heavyStore = createStore<AppState>(heavyState);
let t1 = performance.now();
console.log(`⏱️  Init & Deep Freeze (${HEAVY_USER_COUNT} users): ${(t1 - t0).toFixed(2)} ms`);

// Benchmark 2: Deep Read (Zero-cost reference return)
t0 = performance.now();
for (let i = 0; i < 100_000; i++) {
  void heavyStore.data.settings.theme;
}
t1 = performance.now();
console.log(`⏱️  100,000x Read (store.data.prop): ${(t1 - t0).toFixed(2)} ms`);

// Benchmark 3: Deep Update (Structural sharing + partial freeze)
t0 = performance.now();
heavyStore.update({ 
  settings: { notifications: { push: false } } as DeepPartial<Settings> 
});
t1 = performance.now();
console.log(`⏱️  Deep Update (1 nested prop change): ${(t1 - t0).toFixed(2)} ms`);

// Benchmark 4: Massive Array Replacement
t0 = performance.now();
const newUsers = Array.from({ length: HEAVY_USER_COUNT }, (_, i) => generateUser(i + 1000));
heavyStore.update({ users: newUsers });
t1 = performance.now();
console.log(`⏱️  Array Replace (${HEAVY_USER_COUNT} items): ${(t1 - t0).toFixed(2)} ms`);

// Benchmark 5: Subscription Fan-out
const SUBSCRIBER_COUNT = 1_000;
const subs = [];
for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
  subs.push(heavyStore.subscribe(() => {}));
}

t0 = performance.now();
heavyStore.update({ metadata: { version: 99 } as DeepPartial<AppState["metadata"]> });
t1 = performance.now();
console.log(`⏱️  Notify ${SUBSCRIBER_COUNT} subscribers: ${(t1 - t0).toFixed(2)} ms`);

// Cleanup
subs.forEach(s => s.unsubscribe());

// ============================================================================
// 7. FINAL REPORT
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`🏁 TEST RUN COMPLETE: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("✨ All guarantees hold.");
}