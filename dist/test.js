"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const frosty_1 = require("./frosty");
// Creates a store with its initial state.
const store = (0, frosty_1.createStore)({ nested: null, isData: true });
// With the getter 'store.data' we can retrieve the whole data from the store.
let data = store.data;
console.log(data);
console.assert(Object.hasOwn(data, "nested"));
console.assert(data.nested == null);
// The update method the store can be total or partially updated.
store.update({ nested: { isNested: false, description: "A new nested state with null innerData", innerData: null } });
data = store.data;
console.log(data);
console.assert(!data.nested.isNested);
console.assert(data.nested.innerData == null);
console.assert(data.nested.description.length > 0);
// Update returns the store, so chained updates can be done.
store
    .update({ isData: false })
    .update({ nested: { isNested: true, description: 'Inner data is an empty object now', innerData: {} } })
    .update({ isData: true });
data = store.data;
console.log(data);
console.assert(data.nested.isNested);
console.assert(Object.keys(data.nested.innerData).length === 0);
console.assert(data.nested.description.includes('empty'));
console.assert(data.isData);
// A partial view of the store can be retrieven through the 'getFromKey' method.
// Its argument must be a root data property of the store.
const isDataView = store.getFromKey("isData");
console.log(isDataView);
console.assert(isDataView);
const nested = store.getFromKey("nested");
console.log(nested);
console.assert(nested.isNested);
console.assert(nested.innerData != null);
// The retrieved objects do not share inner references with the objects in the store.
store.update({ nested: { ...nested, innerData: {
            numbers: [1, 2, 3, 4, 5],
            things: { hello: 'world' }
        } } });
data = store.data;
console.assert(data.nested.innerData.things.hello === 'world');
console.assert(data.nested.innerData.numbers[0] === 1);
data.nested.innerData.numbers[0] = 100;
data.nested.innerData.things.hello = 'data';
data.nested.description = 'Data modified';
console.assert(data.nested.innerData.things.hello === 'data');
console.assert(data.nested.innerData.numbers[0] === 100);
console.assert(data.nested.description === 'Data modified');
console.log(data);
data = store.data;
console.log(data);
console.log(data.nested.innerData.numbers);
console.log(data.nested.innerData.things);
console.assert(data.nested.innerData.things.hello === 'world');
console.assert(data.nested.innerData.numbers[0] === 1);
console.assert(data.nested.description === 'Inner data is an empty object now');
// Frosty support subscriptions to notify state changes.
const s1 = store.subscribe((state) => {
    console.log('Subscription 1', state.isData);
});
const s2 = store.subscribe((state) => {
    console.log('Subscription 2', state.isData);
});
const s3 = store.subscribe((state) => {
    console.log('Subscription 3', state.isData);
});
setTimeout(() => {
    store.update({ isData: false });
    console.assert(store.unsubscribe(s1));
    console.log('\nWaiting for the second timeout to complete ...');
}, 4500);
console.log('\nWaiting for the first timeout to complete ...');
// To unsubscribe just call the unsubscribe method this the subscription as argument.
setTimeout(() => {
    store.update({ isData: true });
    console.assert(store.unsubscribe(s2));
    console.assert(store.unsubscribe(s3));
    // Check unsubscriptions
    console.assert(!store.unsubscribe(s1));
    console.assert(!store.unsubscribe(s2));
    console.assert(!store.unsubscribe(s3));
    console.log('\n---> Ok\n');
}, 7500);
//# sourceMappingURL=test.js.map