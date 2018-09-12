import * as moment from 'moment';

export const updateByPropertyName = (propertyName, value) => () => ({
  [propertyName]: value,
});

export const updateNumberByPropertyName = (propertyName, value) => () => ({
  [propertyName]: isNaN(Number(value)) ? null : Number(value),
});

export const removeUndefined = (state) => {
  const newState = { ...state };
  Object.keys(newState).forEach(key => {
    if (newState[key] === undefined || newState[key] === null) {
      delete newState[key];
    }
  });
  return newState;
}

export const convertDates = (state, format) => {
  const newState = { ...state };
  Object.keys(newState).forEach(key => {
    if (moment.isMoment(newState[key])) {
      newState[key] = newState[key].format(format);
    }
  });
  return newState;
}