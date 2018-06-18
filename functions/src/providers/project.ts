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
    admin.database().ref(`/parentCache`).orderByChild("parentProjectPath").equalTo(parentPath).once('value').then(subProjectsSnaps => {
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
}
export class ProjectSummary extends Summary {
  participants: { [participant: string]: Summary } = {};

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

const newProjectSummary = () : ProjectSummary => new ProjectSummary();
const newItemSummary = () : Summary => new Summary();

const increaseSummaryStatus = (summaryStatus: SummaryStatus, newData : ISummaryStatus) => {
  summaryStatus.hours = (summaryStatus.hours || 0) + (newData.hours || 0);
  summaryStatus.difficulty = (summaryStatus.difficulty || 0) + (newData.difficulty || 0);
  summaryStatus.spent = (summaryStatus.spent || 0) + (newData.spent || 0);
};

const increaseSummaryStatuses = (summaryStatuses: Summary, newData: Summary) => {
  increaseSummaryStatus(summaryStatuses.done, newData.done);
  increaseSummaryStatus(summaryStatuses.planned, newData.planned);
  increaseSummaryStatus(summaryStatuses.total, newData.total);
};

const increaseProjectSummary = (summaryStatuses: ProjectSummary, newData: ProjectSummary) => {
  increaseSummaryStatuses(summaryStatuses, newData);
  if (newData.participants) {
    const participantsKeys = Object.keys(newData.participants);
    for (const participant of participantsKeys) {
      const newParticipantSummary = newData.participants[participant];
      let currentParticipantSummary = summaryStatuses.participants[participant];
      if (!currentParticipantSummary) {
        currentParticipantSummary = new Summary();
        summaryStatuses.participants[participant] = currentParticipantSummary;
      }
      increaseSummaryStatuses(currentParticipantSummary, newParticipantSummary);
    }
  }
};

export const calculateSummary = (hiveId, projectId) => {
  const projectPath = `/hives/${hiveId}/projects/${projectId}`;
  return admin.database().ref(projectPath).once('value').then(projectSnap => {
    const project = projectSnap.val();
    const participantsMap = project.participants || {};
    const promises = [];
    const todayEnd = moment().endOf('day').valueOf();
    promises.push(listSubProjects(hiveId, projectId).then(subProjectsResults => {
      const subSummary = newProjectSummary();
      for (const subProjectSnap of subProjectsResults) {
        const subProject = subProjectSnap.val();
        if (subProject.summary) {
          increaseProjectSummary(subSummary, subProject.summary);
        }
      };
      return subSummary;
    }));
    promises.push(admin.database().ref(`/hives/${hiveId}/executions`).orderByChild('project').equalTo(projectId).once('value').then(executionsSnaps => {
      console.log(`project ${projectId} execs`, executionsSnaps.numChildren());
      const executionsSummary = newProjectSummary();

      executionsSnaps.forEach(executionSnap => {
        // const executionKey = executionSnap.key;
        const execution = executionSnap.val();
        const statusSummary = execution.dateValue && execution.dateValue > todayEnd ? executionsSummary.planned : executionsSummary.done;
        execution.spent = getExecutionPrice(execution, participantsMap[execution.participant]);
        increaseSummaryStatus(statusSummary, execution);
        increaseSummaryStatus(executionsSummary.total, execution);
        if (execution.participant) {
          let participantSummary = executionsSummary.participants[execution.participant];
          if (!participantSummary) {
            participantSummary = newItemSummary();
            executionsSummary.participants[execution.participant] = participantSummary;
          }
          const participantStatusSummary = execution.dateValue && execution.dateValue > todayEnd ? participantSummary.planned : participantSummary.done;
          increaseSummaryStatus(participantStatusSummary, execution);
          increaseSummaryStatus(participantSummary.total, execution);
        }
      });
      return executionsSummary;
    }));
    return Promise.all(promises).then(results => {
      const baseSummary = newProjectSummary();
      increaseProjectSummary(baseSummary, results[0]);
      increaseProjectSummary(baseSummary, results[1]);
      if (project.totalDifficulty && project.totalDifficulty > 0) {
        baseSummary.todoDifficulty = Math.max(project.totalDifficulty - baseSummary.done.difficulty, 0);
        baseSummary.difficultyProgress = Math.min(baseSummary.done.difficulty / project.totalDifficulty, 1);
      }
      if (project.price && project.price > 0) {
        baseSummary.availableAmount = Math.max(project.price - baseSummary.done.spent, 0);
        baseSummary.spentProgress = Math.min(baseSummary.done.spent / project.price, 1);
      }
      return baseSummary;
    });
  });
}

export const updateSummary = (hiveId, projectId) => {
  return calculateSummary(hiveId, projectId).then(baseSummary => {
    return admin.database().ref(`/hives/${hiveId}/projects/${projectId}/summary`).set(baseSummary).then(() => {
      return baseSummary;
    });
  });
}

const promiseSerial = funcs =>
  funcs.reduce((promise, func) =>
    promise.then(result => func().then(Array.prototype.concat.bind(result))),
    Promise.resolve([]))

export const updateAllSummaries = () => {
  return admin.database().ref(`/hives`).once('value').then((hivesSnap) => {
    const promises = [];
    const hives = hivesSnap.val();
    // console.log(hives);
    for (const hiveId in hives) {
      if (hives.hasOwnProperty(hiveId)) {
        const hive = hives[hiveId];
        if (hive.projects) {
          Array.prototype.push.apply(promises, Object.keys(hive.projects).map(projectId => ({ hiveId, projectId })));
        }
      }
    }
    return promises.length === 0 ? [] : promiseSerial(promises.map(task => exec => updateSummary(task.hiveId, task.projectId)));
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
  if (project.doneAt) {
    const doneAtDateValue = moment(project.doneAt, "YYYY-MM-DD").valueOf();
    if (!project.doneAtDateValue || project.doneAtDateValue !== doneAtDateValue) {
      project.doneAtDateValue = doneAtDateValue;
      newValues.doneAtDateValue = doneAtDateValue;
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
      return Object.assign({}, project, { key: projectKey });
    });
  }
  
  return Promise.resolve(Object.assign({}, project, { key: projectKey }));
};