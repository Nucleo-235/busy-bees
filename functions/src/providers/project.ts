// import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';

export const getCachePath = (hive, project) => {
  return `/parentCache/${hive}___${project}`;
}

export const cacheProjectParent = (hive, project, parentProjectPath) => {
  const cachePath = getCachePath(hive, project);
  if (parentProjectPath) {
    return admin.database().ref(cachePath).set({ parentProjectPath, hive, project });
  } else {
    return new Promise(resolve => {
      admin.database().ref(cachePath).remove().then(() => { resolve(true) }, () => { resolve(true) });
    })
  }
};

export const listProjects = (projectsKeys) : Promise<any[]> => {
  const promises = [];
  for (const keys of projectsKeys) {
    promises.push(admin.database().ref(`/hives/${keys.hive}/projects/${keys.project}`).once('value'));
  }
  return promises.length === 0 ? Promise.resolve([]) : Promise.all(promises);
};

export const listSubProjects = (hiveId, projectId) : Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const parentPath = `/hives/${hiveId}/projects/${projectId}`;
    admin.database().ref(`/parentCache`).orderByValue().equalTo(parentPath).once('value').then(subProjectsSnaps => {
      const projectInfos = [];
      subProjectsSnaps.forEach(subProjectSnap => {
        const subProjectinfo = subProjectSnap.val();
        if (subProjectinfo)
          projectInfos.push(subProjectinfo)
      });
      listProjects(projectInfos).then(resolve, reject);
    }, reject)
  })
};

const getExecutionPrice = (execution, participant) => {
  if (execution.price) {
    return execution.price;
  } else if (execution.custom_hour_value) {
    return execution.hours * execution.custom_hour_value;
  } else if (participant) {
    return execution.hours * participant.hour_value;
  } else {
    return null;
  }
}

export const calculateSummary = (hiveId, projectId) => {
  return new Promise((resolve, reject) => {
    const projectPath = `/hives/${hiveId}/projects/${projectId}`;
    admin.database().ref(projectPath).once('value').then(projectSnap => {
      const project = projectSnap.val();
      const participantsMap = project.participants || {};
      const promises = [];
      promises.push(listSubProjects(hiveId, projectId).then(subProjectsResults => {
        let sumHours = 0;
        let sumDifficulty = 0;
        let sumSpent = 0;
        for (const subProjectSnap of subProjectsResults) {
          const subProject = subProjectSnap.val();
          if (subProject.summary) {
            sumHours += subProject.doneHours;
            sumDifficulty += subProject.doneDifficulty;
            sumSpent += subProject.amountSpent;
          }
        };
        return { sumHours, sumDifficulty, sumSpent };
      }));
      promises.push(admin.database().ref(`/hives/${hiveId}/executions`).orderByChild('project').equalTo(projectId).once('value').then(executionsSnaps => {
        let sumHours = 0;
        let sumDifficulty = 0;
        let sumSpent = 0;
        executionsSnaps.forEach(executionSnap => {
          // const executionKey = executionSnap.key;
          const execution = executionSnap.val();
          sumHours += execution.hours;
          if (execution.difficulty) {
            sumDifficulty += execution.difficulty;
          }
          const spent = getExecutionPrice(execution, participantsMap[execution.participant]);
          if (spent) {
            sumSpent += spent;
          }
        });
        return { sumHours, sumDifficulty, sumSpent };
      }));
      Promise.all(promises).then(results => {
        const baseSummary: any = {
          doneHours: (results[0].sumHours + results[1].sumHours),
          doneDifficulty: (results[0].sumDifficulty + results[1].sumDifficulty),
          amountSpent: (results[0].sumSpent + results[1].sumSpent),
        };
        if (project.totalDifficulty && project.totalDifficulty > 0) {
          baseSummary.todoDifficulty = Math.max(project.totalDifficulty - baseSummary.doneDifficulty, 0);
          baseSummary.difficultyProgress = Math.min(baseSummary.doneDifficulty / project.totalDifficulty, 1);
        }
        if (project.price && project.price > 0) {
          baseSummary.availableAmount = Math.max(project.price - baseSummary.amountSpent, 0);
          baseSummary.spentProgress = Math.min(baseSummary.amountSpent / project.price, 1);
        }
        resolve(baseSummary);
      }, reject);
    }, reject);
  });
}

export const updateSummary = (hiveId, projectId) => {
  return new Promise((resolve, reject) => {
    calculateSummary(hiveId, projectId).then(baseSummary => {
      admin.database().ref(`/hives/${hiveId}/projects/${projectId}/summary`).set(baseSummary).then(() => {
          resolve(baseSummary);
      }, reject);
    }, reject);
  });
}

export const checkDeadlineDate = (hiveId, projectKey, project) => {
  if (project.deadline) {
    const deadlineDateValue = moment(project.deadline, "YYYY-MM-DD").valueOf();
    if (!project.deadlineDateValue || project.deadlineDateValue != deadlineDateValue) {
      project.deadlineDateValue = deadlineDateValue;
      return admin.database().ref(`/hives/${hiveId}/projects/${projectKey}/deadlineDateValue`).set(project.deadlineDateValue).then(() => {
        return Promise.resolve(Object.assign({}, project, { key: projectKey }));
      });
    }
  }
  return Promise.resolve(Object.assign({}, project, { key: projectKey }));
};