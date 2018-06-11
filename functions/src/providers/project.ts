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

export interface ISummaryStatus {
  difficulty: number;
  hours: number;
  spent: number;
}

export class SummaryStatus implements ISummaryStatus{
  difficulty: number = 0;
  hours: number = 0;
  spent: number = 0;
}

export class Summary {
  done: SummaryStatus = new SummaryStatus();
  planned: SummaryStatus = new SummaryStatus;
  total: SummaryStatus = new SummaryStatus;

  todoDifficulty: number = 0;
  difficultyProgress: number = 0;
  availableAmount: number = 0;
  spentProgress: number = 0;
}

const getExecutionPrice = (execution, participant) => {
  if (execution.price) {
    return execution.price;
  } else if (execution.custom_hour_value) {
    return execution.hours * execution.custom_hour_value;
  } else if (participant) {
    return execution.hours * participant.hour_value;
  } else {
    return 0;
  }
}

const newSummary = () : Summary => new Summary();

const increaseSummaryStatus = (summaryStatus: SummaryStatus, newData : ISummaryStatus) => {
  summaryStatus.hours += newData.hours || 0;
  summaryStatus.difficulty += newData.difficulty || 0;
  summaryStatus.spent += newData.spent || 0;
};

const increaseSummaryStatuses = (summaryStatuses: Summary, newData: Summary) => {
  increaseSummaryStatus(summaryStatuses.done, newData.done);
  increaseSummaryStatus(summaryStatuses.planned, newData.planned);
  increaseSummaryStatus(summaryStatuses.total, newData.total);
};

export const calculateSummary = (hiveId, projectId) => {
  return new Promise((resolve, reject) => {
    const projectPath = `/hives/${hiveId}/projects/${projectId}`;
    admin.database().ref(projectPath).once('value').then(projectSnap => {
      const project = projectSnap.val();
      const participantsMap = project.participants || {};
      const promises = [];
      const todayEnd = moment().endOf('day').valueOf();
      promises.push(listSubProjects(hiveId, projectId).then(subProjectsResults => {
        let subSummary = newSummary();
        
        for (const subProjectSnap of subProjectsResults) {
          const subProject = subProjectSnap.val();
          if (subProject.summary) {
            increaseSummaryStatuses(subSummary, subProject.summary);
          }
        };
        return subSummary;
      }));
      promises.push(admin.database().ref(`/hives/${hiveId}/executions`).orderByChild('project').equalTo(projectId).once('value').then(executionsSnaps => {
        let executionsSummary = newSummary();

        executionsSnaps.forEach(executionSnap => {
          // const executionKey = executionSnap.key;
          const execution = executionSnap.val();
          const statusSummary = execution.dateValue && execution.dateValue > todayEnd ? executionsSummary.planned : executionsSummary.done;
          execution.spent = getExecutionPrice(execution, participantsMap[execution.participant]);
          increaseSummaryStatus(statusSummary, execution);
          increaseSummaryStatus(executionsSummary.total, execution);
        });
        return executionsSummary;
      }));
      Promise.all(promises).then(results => {
        let baseSummary = newSummary();
        increaseSummaryStatuses(baseSummary, results[0]);
        increaseSummaryStatuses(baseSummary, results[1]);
        if (project.totalDifficulty && project.totalDifficulty > 0) {
          baseSummary.todoDifficulty = Math.max(project.totalDifficulty - baseSummary.done.difficulty, 0);
          baseSummary.difficultyProgress = Math.min(baseSummary.done.difficulty / project.totalDifficulty, 1);
        }
        if (project.price && project.price > 0) {
          baseSummary.availableAmount = Math.max(project.price - baseSummary.done.spent, 0);
          baseSummary.spentProgress = Math.min(baseSummary.done.spent / project.price, 1);
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

export const updateAllSummaries = () => {
  return new Promise((resolve, reject) => {
    admin.database().ref(`/hives`).once('value').then((hives) => {
      const promises = [];
      hives.forEach(hiveSnap => {
        const hiveId = hiveSnap.key;
        const hive = hiveSnap.val();
        if (hive.projects) {
          Array.prototype.push(promises, Object.keys(hive.projects).map(projectId => updateSummary(hiveId, projectId)));
        }
      });
      return promises.length === 0 ? resolve([]) : Promise.all(promises).then(resolve, reject);
    }, reject);
  });
}

export const checkCalculatedValues = (hiveId, projectKey, project) => {
  const newValues: any = {};
  if (project.deadline) {
    const deadlineDateValue = moment(project.deadline, "YYYY-MM-DD").valueOf();
    if (!project.deadlineDateValue || project.deadlineDateValue !== deadlineDateValue) {
      project.deadlineDateValue = deadlineDateValue;
      newValues.deadlineDateValue = deadlineDateValue;
    }
  }
  if (project.startAt) {
    const startAtDateValue = moment(project.startAt, "YYYY-MM-DD").valueOf();
    if (!project.startAtDateValue || project.startAtDateValue !== startAtDateValue) {
      project.startAtDateValue = startAtDateValue;
      newValues.startAtDateValue = startAtDateValue;
    }
  }

  if (project.deadlineDateValue && project.startAtDateValue) {
    const deadlineDaysPeriod = Math.ceil(moment(project.deadlineDateValue).diff(moment(project.startAtDateValue), 'days', true));
    if (!project.deadlineDaysPeriod || project.deadlineDaysPeriod !== deadlineDaysPeriod) {
      project.deadlineDaysPeriod = deadlineDaysPeriod;
      newValues.deadlineDaysPeriod = deadlineDaysPeriod;
    }
  }

  if (Object.keys(newValues).length > 0) {
    return admin.database().ref(`/hives/${hiveId}/projects/${projectKey}`).update(newValues).then(() => {
      return Promise.resolve(Object.assign({}, project, { key: projectKey }));
    });
  }
  
  return Promise.resolve(Object.assign({}, project, { key: projectKey }));
};