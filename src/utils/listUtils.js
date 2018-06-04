export const snapToArray = snap => {
  var records = [];
  snap.forEach(function(ss) {
    records.push( ss.val() );
  });
  return records;
}