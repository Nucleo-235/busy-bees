import * as admin from 'firebase-admin';
import * as moment from 'moment';

const doExecutionToSchedule = (hiveId, executionKey, execution, user) => {
  const scheduleItem = Object.assign({}, execution);
  delete scheduleItem.participant;
  return admin.database().ref(`/userSchedule/${user.key}/${executionKey}`).update(scheduleItem).then(() => scheduleItem);
};

const getUserByUsername = participant => {
  return admin.database().ref(`/users`).orderByChild("username").equalTo(participant).once('value').then(usersSnap => {
    let currentUser = null;
    usersSnap.forEach(userSnap => {
      const user = userSnap.val();
      user.key = userSnap.key;
      console.log('usersSnap found', userSnap.key);
      currentUser = user;
    });
    
    return currentUser;
  });
}

export const executionToSchedule = (hiveId, executionKey, execution) => {
  if (execution.participant) {
    return getUserByUsername(execution.participant).then(user => {
      if (user) {
        return doExecutionToSchedule(hiveId, executionKey, execution, user);
      } else {
        return null;
      }
    })
  } else {
    return Promise.resolve(false);
  }
};

export const executionsToSchedules = (hiveId) => {
  return admin.database().ref(`/hives/${hiveId}/executions`).once('value').then(executionsSnaps => {
    var participantExecutionsMap = { };
    executionsSnaps.forEach(executionSnap => {
      const execution = executionSnap.val();
      const key = executionSnap.key;
      if (execution.participant) {
        var executionList = participantExecutionsMap[execution.participant];
        if (executionList) {
          executionList.push({ key, execution });
        } else {
          participantExecutionsMap[execution.participant] = [ { key, execution } ];
        }
      }
    });
    const userPromises = Object.keys(participantExecutionsMap).map(username => getUserByUsername(username));
  
    return userPromises.length === 0 ? Promise.resolve([]) : Promise.all(userPromises).then(users => {
      const executionPromises = [];
      for (const userWithKey of users) {
        if (userWithKey) {
          const newPromises = participantExecutionsMap[userWithKey.username].map((execData: any) => doExecutionToSchedule(hiveId, execData.key, execData.execution, userWithKey));
          Array.prototype.push.apply(executionPromises, newPromises);
        }
      }

      return executionPromises.length === 0 ? Promise.resolve([]) : Promise.all(executionPromises);
    });
  });
};