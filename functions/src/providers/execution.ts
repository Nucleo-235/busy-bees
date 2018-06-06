// import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';

export const checkDate = (hiveId, executionKey, execution) => {
  if (execution.date) {
    const dateValue = moment(execution.date, "YYYY-MM-DD").valueOf();
    if (!execution.dateValue || execution.dateValue !== dateValue) {
      execution.dateValue = dateValue;
      return admin.database().ref(`/hives/${hiveId}/executions/${executionKey}/dateValue`).set(execution.dateValue).then(() => {
        return Promise.resolve(Object.assign({}, execution, { key: executionKey }));
      });
    }
  }
  return Promise.resolve(Object.assign({}, execution, { key: executionKey }));
};