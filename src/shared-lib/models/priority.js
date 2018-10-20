"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getPriorities(hivePriorities, projectPriorities) {
    const priorities = Object.assign({}, hivePriorities || {}, projectPriorities || {});
    for (const priorityKey of Object.keys(priorities)) {
        priorities[priorityKey].key = priorityKey;
    }
    return priorities;
}
exports.getPriorities = getPriorities;
exports.findPriority = (itemPriority, priorities) => {
    if (itemPriority && priorities[itemPriority]) {
        return priorities[itemPriority];
    }
    let defaultPriority = null;
    for (const priorityKey of Object.keys(priorities)) {
        const currentPriority = priorities[priorityKey];
        if (!defaultPriority || currentPriority.hour_price < defaultPriority.hour_price)
            defaultPriority = priorities[priorityKey];
    }
    return defaultPriority;
};
//# sourceMappingURL=priority.js.map