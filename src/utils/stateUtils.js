export const updateByPropertyName = (propertyName, value) => () => ({
  [propertyName]: value,
});
export const updateNumberByPropertyName = (propertyName, value) => () => ({
  [propertyName]: isNaN(Number(value)) ? null : Number(value),
});