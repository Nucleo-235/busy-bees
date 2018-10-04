import { db, auth } from './firebase';

// User API

export const doCreateUser = (id, username, email, displayName = null, photoURL = null) => {
  const profile = {
    username,
    email,
  };
  if (displayName) {
    profile.displayName = displayName;
  }
  if (photoURL) {
    profile.photoURL = photoURL;
  }
  return db.ref(`users/${id}`).update({
    profile,
    email
  });
}

export const saveExecution = (hive, execution, executionKey = null) => {
  if (executionKey) {
    return db.ref(`hives/${hive}/executions/${executionKey}`).update(execution).then((key) => {
      return { key: key, val: () => execution };
    });
  } else {
    return db.ref(`hives/${hive}/executions`).push(execution).then((key) => {
      return { key: key, val: () => execution };
    });
  }
}

export const saveProject = (hive, project, projectKey) => {
  return db.ref(`hives/${hive}/projects/${projectKey}`).set(project).then((key) => {
    return { key: key, val: () => project };
  });
}

export const onceGetHives = () => {
  const userId = auth.currentUser.uid;
  return new Promise((resolve, reject) => {
    db.ref(`users/${userId}/hives`).once('value').then(results => {
      const promises = [];
      results.forEach(snap => {
        promises.push(db.ref(`hives/${snap.key}/profile`).once('value'));
      });
      if (promises.length > 0) {
        Promise.all(promises).then(finalResults => {
          const resultMap = {};
          finalResults.forEach(element => {
            const key = element.ref.getParent().key;
            resultMap[key] = element.val();
          });
          resolve(resultMap);
          return resultMap;
        }, reject);
      } else {
        resolve([]);
      }
    }, reject);
  })
};

export const loadHiveTeams = (hives) => {
  const hiveKeys = Object.keys(hives);
  const promises = hiveKeys.map(hiveKey => db.ref(`hives/${hiveKey}/team`).once('value'));
  return Promise.all(promises).then(teamsSnap => {
    teamsSnap.forEach((snap, idx) => {
      hives[hiveKeys[idx]].team = snap.val();
    });
    return hives;
  })
}

export const onceGetParticipants = (hive, project) => {
  return new Promise((resolve, reject) => {
    db.ref(`hives/${hive}/projects/${project}/participants`).once('value').then(snapshot => {
      resolve(snapshot.val());
    }, reject);
  })
};

export const firstProjectSummaryChange = (hive, project) => {
  return new Promise((resolve, reject) => {
    const timeoutValue = setTimeout(() => {
      resolve(null);
    }, 1500);
    let loadedInitial = false;
    var summaryRef = db.ref(`hives/${hive}/projects/${project}/summary`);
    summaryRef.once('value').then(snapshot => {
      loadedInitial = true;
      summaryRef.on('value', function(snapshot) {
        if (loadedInitial) {
          clearTimeout(timeoutValue);
          resolve(snapshot.val());
        }
      });
    });
  })
};

export const onceGetProjectSnapshot = (hive, project) => {
  return db.ref(`hives/${hive}/projects/${project}`).once('value');
};

export const onceGetExecutionSnapshot = (hive, key) => {
  return db.ref(`hives/${hive}/executions/${key}`).once('value');
};

export const onceGetProjectExecutionsSnapshot = (hive, project) => {
  return db.ref(`/hives/${hive}/executions`).orderByChild('project').equalTo(project).once('value');
};

export const onceGetHiveTeamSnapshot = (hive) => {
  return db.ref(`/hives/${hive}/teams`).once('value');
};

export const onceGetHivePrioritiesSnapshot = (hive) => {
  return db.ref(`/hives/${hive}/priorities`).once('value');
};

export const onceGetUserExecutionsMap = (range = null) => {
  const userId = auth.currentUser.uid;
  if (range) {
    return db.ref(`userSchedule/${userId}`).orderByChild("dateValue").startAt(range.start).endAt(range.end).once('value').then(scheduleValues => scheduleValues.val());
  } else {
    return db.ref(`userSchedule/${userId}`).once('value').then(scheduleValues => scheduleValues.val());
  }
};

export const onceGetHivesWithProjects = () => {
  return new Promise((resolve, reject) => {
    onceGetHives().then(hives => {
      const promises = [];
      for (const hiveKey in hives) {
        if (hives.hasOwnProperty(hiveKey)) {
          const hive = hives[hiveKey];
          promises.push(db.ref(`hives/${hiveKey}/projects`).once('value').then(projectsSnap => {
            hive.projects = projectsSnap.val();
            return hive;
          }));
        }
      }
      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          resolve(hives);
        }, reject);
      } else {
        resolve([]);
      }
    }, reject);
  });
};

// Other db APIs ...
