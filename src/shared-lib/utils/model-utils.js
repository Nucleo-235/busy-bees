"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function snapToModel(itemSnap, itemType) {
    if (itemSnap.exists()) {
        const result = Object.assign(new itemType(), itemSnap.val());
        result.key = itemSnap.key;
        return result;
    }
    else
        return null;
}
exports.snapToModel = snapToModel;
function snapsToModelList(snapList, itemType) {
    const list = [];
    snapList.forEach(function (itemSnap) {
        const result = Object.assign(new itemType(), itemSnap.val());
        result.key = itemSnap.key;
        list.push(result);
    });
    return list;
}
exports.snapsToModelList = snapsToModelList;
function snapsToModelMap(snapList, itemType) {
    const map = {};
    snapList.forEach(function (itemSnap) {
        const result = Object.assign(new itemType(), itemSnap.val());
        result.key = itemSnap.key;
        map[result.key] = result;
    });
    return map;
}
exports.snapsToModelMap = snapsToModelMap;
function listToModelList(originalList, itemType) {
    return originalList.map(item => Object.assign(new itemType(), item));
}
exports.listToModelList = listToModelList;
function castList(originalList, itemType) {
    return originalList.map(item => Object.assign(new itemType(), item));
}
exports.castList = castList;
function mapToModelMap(itemMap, itemType) {
    const map = {};
    for (const key in itemMap) {
        if (itemMap.hasOwnProperty(key)) {
            const item = itemMap[key];
            map[key] = Object.assign(new itemType(), item);
        }
    }
    return map;
}
exports.mapToModelMap = mapToModelMap;
//# sourceMappingURL=model-utils.js.map