"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStore = createStore;
class FrostyStore {
    state;
    subscriptions = [];
    constructor(initialState) {
        this.state = initialState;
        Object.freeze(this.state);
    }
    update(updatedState) {
        this.state = {
            ...this.state,
            ...updatedState
        };
        Object.freeze(this.state);
        this.subscriptions.forEach(fn => {
            fn(this.data);
        });
    }
    get data() {
        return Object.freeze(structuredClone(this.state));
    }
    getFromKey(key) {
        const p = { [key]: this.state[key] };
        return Object.freeze(p);
    }
    subscribe(fn) {
        this.subscriptions.push(fn);
    }
}
function createStore(initialState) {
    return new FrostyStore(initialState);
}
//# sourceMappingURL=frosty.js.map