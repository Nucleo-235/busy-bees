// import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const calculateSummary = (projectId) => {
  return new Promise((resolve, reject) => {
    admin.database().ref(`/projects/${projectId}`).once('value').then(projectSnap => {
      const project = projectSnap.val();
      const participantsMap = project.participants || {};
      const promises = [];
      promises.push(admin.database().ref(`/projects`).orderByChild('parentProject').equalTo(projectId).once('value').then(subProjectsSnaps => {
        let sumHours = 0;
        let sumDifficulty = 0;
        let sumSpent = 0;
        subProjectsSnaps.forEach(subProjectSnap => {
          // const subProjectKey = subProjectSnap.key;
          const subProject = subProjectSnap.val();
          if (subProject.summary) {
            sumHours += subProject.doneHours;
            sumDifficulty += subProject.doneDifficulty;
            sumSpent += subProject.amountSpent;
          }
        });
        return { sumHours, sumDifficulty, sumSpent };
      }));
      promises.push(admin.database().ref(`/executions`).orderByChild('project').equalTo(projectId).once('value').then(executionsSnaps => {
        let sumHours = 0;
        let sumDifficulty = 0;
        let sumSpent = 0;
        executionsSnaps.forEach(executionSnap => {
          // const executionKey = executionSnap.key;
          const execution = executionSnap.val();
          sumHours += execution.hours;
          sumDifficulty += execution.difficulty;
          const participant = participantsMap[execution.participant];
          if (participant) {
            sumSpent += (execution.hours * participant.hour_value);
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
          baseSummary.difficultyProgress = Math.min(baseSummary.amountSpent / project.price, 1);
        }
        resolve(baseSummary);
      }, reject);
    }, reject);
  });
}

export const updateSummary = (projectId) => {
  return new Promise((resolve, reject) => {
    calculateSummary(projectId).then(baseSummary => {
      admin.database().ref(`/projects/${projectId}/summary`).set(baseSummary).then(() => {
          resolve(baseSummary);
      }, reject);
    }, reject);
  });
}