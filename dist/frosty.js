"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStore = createStore;
const nanoid_1 = require("nanoid");
class FrostyStore {
    storeId;
    state;
    subscriptions;
    constructor(initialState) {
        this.storeId = (0, nanoid_1.nanoid)();
        this.subscriptions = new Map();
        this.state = initialState;
        Object.freeze(this.state);
    }
    update(updatedState) {
        this.state = { ...this.state, ...updatedState };
        Object.freeze(this.state);
        this.subscriptions.forEach(cb => cb(this.data));
        return this;
    }
    get data() {
        return structuredClone(this.state);
    }
    getFromKey(key) {
        return structuredClone(this.state[key]);
    }
    subscribe(cb) {
        const id = (0, nanoid_1.nanoid)(31);
        this.subscriptions.set(id, cb);
        const susbcription = Object.freeze({ id, origin: this.storeId });
        return () => susbcription;
    }
    unsubscribe(subscriptionFn) {
        const metadata = subscriptionFn();
        if (this.storeId !== metadata.origin) {
            return false;
        }
        return this.subscriptions.delete(metadata.id);
    }
}
function createStore(initialState) {
    return new FrostyStore(initialState);
}
//# sourceMappingURL=frosty.js.map