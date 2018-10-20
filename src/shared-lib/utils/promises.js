"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promiseSerial = funcs => funcs.reduce((promise, func) => promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]));
//# sourceMappingURL=promises.js.map