export const snapToArray = snap => {
  var records = [];
  snap.forEach(function(ss) {
    const item = ss.val();
    if (item && !item.key) {
      item.key = ss.key;
    }
    records.push(item);
  });
  return records;
}

export const mapToArray = map => {
  return map ? Object.keys(map).map(key => {
    const item = map[key];
    if (item && !item.key) {
      item.key = key;
    }
    return item;
  }) : [];
}

export const listToHash = list => {
  const hash = {};
  (list || []).forEach(value => {
    const newValue = { ...value };
    delete newValue.key;
    hash[value.key] = newValue;
  });
  return hash;
}