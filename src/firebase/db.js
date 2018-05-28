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
