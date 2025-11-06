"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStore = createStore;
const nanoid_1 = require("nanoid");
class Subscription {
    _id;
    _origin;
    constructor(_id, _origin) {
        this._id = _id;
        this._origin = _origin;
    }
    get id() {
        return this._id;
    }
    get origin() {
        return this._origin;
    }
}
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
        const susbcription = Object.freeze(new Subscription(id, this.storeId));
        return () => susbcription;
    }
    unsubscribe(subscriptionFn) {
        const metadata = subscriptionFn();
        return this.storeId === metadata.origin && this.subscriptions.delete(metadata.id);
    }
}
function createStore(initialState) {
    return new FrostyStore(initialState);
}
//# sourceMappingURL=frosty.js.map