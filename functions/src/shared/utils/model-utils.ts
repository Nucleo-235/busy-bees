export function snapToModel<T>(itemSnap, itemType: new () => T): T {
  if (itemSnap.exists()) {
    const result = Object.assign(new itemType(), itemSnap.val());
    result.key = itemSnap.key;
    return result;
  } else 
    return null;
}

export function snapsToModelList<T>(snapList, itemType: new () => T) : T[] {
  const list = [];
  snapList.forEach(function(itemSnap) {
    const result = Object.assign(new itemType(), itemSnap.val());
    result.key = itemSnap.key;
    list.push(result);
  });
  return list;
}

export function snapsToModelMap<T>(snapList, itemType: new () => T): { [key: string]: T } {
  const map = {};
  snapList.forEach(function(itemSnap) {
    const result = Object.assign(new itemType(), itemSnap.val());
    result.key = itemSnap.key;
    map[result.key] = result;
  });
  return map;
}

export function listToModelList<T>(originalList: any[], itemType: new () => T): T[] {
  return originalList.map(item => Object.assign(new itemType(), item));
}

export function castList<M,T>(originalList: M[], itemType: new () => T): T[] {
  return originalList.map(item => Object.assign(new itemType(), item));
}

export function mapToModelMap<T>(itemMap, itemType: new () => T) : { [key: string]: T } {
  const map = {};
  for (const key in itemMap) {
    if (itemMap.hasOwnProperty(key)) {
      const item = itemMap[key];
      map[key] = Object.assign(new itemType(), item);
    }
  }
  return map;
}