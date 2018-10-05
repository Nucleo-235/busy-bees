import * as admin from 'firebase-admin';
import * as moment from 'moment';

import { promiseSerial } from '../utils/promises';
import { getParticipants, getPriorities, findPriority } from '../models/project';
import { 
  ISummaryStatus, 
  SummaryStatus, 
  Summary, 
  ProjectSummary, 
  getExecutionEarnPrice, 
  getExecutionSpentPrice, 
  newProjectSummary, 
  newItemSummary, 
} from '../models/project-summary';

import * as projectProvier from './project';

const getProjectFilterByType = (project, dateReference) => {
  if (project.type === 'recurrent') {
    const period = project.period || "month";
    const refDate = dateReference || new Date();
    const startPeriod = moment(refDate).startOf(period).valueOf();
    const endPeriod = moment(refDate).endOf(period).valueOf();
    return execution => {
      return execution.dateValue >= startPeriod && execution.dateValue <= endPeriod;
    };
  } else {
    return execution => execution;
  }
};

const increaseSummaryStatus = (summaryStatus: SummaryStatus, newData : ISummaryStatus) => {
  summaryStatus.hours = (summaryStatus.hours || 0) + (newData.hours || 0);
  summaryStatus.difficulty = (summaryStatus.difficulty || 0) + (newData.difficulty || 0);
  summaryStatus.spent = (summaryStatus.spent || 0) + (newData.spent || 0);
  summaryStatus.earned = (summaryStatus.earned || 0) + (newData.earned || 0);
};

const increaseSummaryStatuses = (summaryStatuses: Summary, newData: Summary) => {
  increaseSummaryStatus(summaryStatuses.done, newData.done);
  increaseSummaryStatus(summaryStatuses.planned, newData.planned);
  increaseSummaryStatus(summaryStatuses.total, newData.total);
};

const increatedNestedSummary = (currentNestedData, newNestedData) => {
  if (newNestedData) {
    const keys = Object.keys(newNestedData);
    for (const nestedKey of keys) {
      let currenteNestedItem = currentNestedData[nestedKey];
      if (!currenteNestedItem) {
        currenteNestedItem = new Summary();
        currentNestedData[nestedKey] = currenteNestedItem;
      }
      increaseSummaryStatuses(currenteNestedItem, newNestedData[nestedKey]);
    }
  }
}

const increaseProjectSummary = (summaryStatuses: ProjectSummary, newData: ProjectSummary) => {
  increaseSummaryStatuses(summaryStatuses, newData);
  increatedNestedSummary(summaryStatuses.participants, newData.participants);
  increatedNestedSummary(summaryStatuses.priorities, newData.priorities);
};

const doListProjectExecutions = (hiveId, projectId, project, dateReference = null) => {
  return admin.database().ref(`/hives/${hiveId}/executions`).orderByChild('project').equalTo(projectId).once('value').then(executionsSnaps => {
    // console.log(`project ${projectId} execs`, executionsSnaps.numChildren());
    const projectFilter = getProjectFilterByType(project, dateReference);

    const executionsFiltered = [];
    executionsSnaps.forEach(executionSnap => {
      // const executionKey = executionSnap.key;
      const execution = executionSnap.val();
      if (projectFilter(execution)) {
        execution.key = executionSnap.key;
        executionsFiltered.push(execution);
      }
    });
    return executionsFiltered;
  });
};

export const listProjectExecutions = (hiveId, projectId, dateReference = null) => {
  return admin.database().ref(`/hives/${hiveId}/projects/${projectId}`).once('value').then(snap => {
    return doListProjectExecutions(hiveId, projectId, snap.val(), dateReference);
  });
}

export const calculateSummary = (hiveId, projectId, dateReference = null) => {
  return Promise.all([
    admin.database().ref(`/hives/${hiveId}/team`).once('value'),
    admin.database().ref(`/hives/${hiveId}/projects/${projectId}`).once('value'),
    admin.database().ref(`/hives/${hiveId}/priorities`).once('value'),
  ]).then(initialResults => {
    const hiveParticipants = initialResults[0].val();
    const project = initialResults[1].val();
    const prioritiesMap = getPriorities(initialResults[2].val(), project.priorities);
    const participantsMap = getParticipants(hiveParticipants || {}, project.participants || {});
    const promises = [];
    const todayStart = moment().startOf('day').valueOf();
    const todayEnd = moment().endOf('day').valueOf();

    promises.push(projectProvier.listSubProjects(hiveId, projectId).then(subProjectsResults => {
      const subSummary = newProjectSummary();
      for (const subProjectSnap of subProjectsResults) {
        const subProject = subProjectSnap.val();
        if (subProject.summary) {
          increaseProjectSummary(subSummary, subProject.summary);
        }
      };
      return subSummary;
    }));
    promises.push(doListProjectExecutions(hiveId, projectId, project, dateReference).then(executions => {
      const executionsSummary = newProjectSummary();

      for (const execution of executions) {
        const isPlanned = execution.dateValue > todayEnd || (execution.dateValue >= todayStart && execution.planned);
        const statusSummary = isPlanned ? executionsSummary.planned : executionsSummary.done;
        execution.spent = getExecutionSpentPrice(execution, participantsMap[execution.participant], project);
        execution.earned = getExecutionEarnPrice(execution, participantsMap[execution.participant], project, prioritiesMap);
        increaseSummaryStatus(statusSummary, execution);
        increaseSummaryStatus(executionsSummary.total, execution);
        if (execution.participant) {
          let nestedSummary = executionsSummary.participants[execution.participant];
          if (!nestedSummary) {
            nestedSummary = newItemSummary();
            executionsSummary.participants[execution.participant] = nestedSummary;
          }
          const nestedStatusSummary = execution.dateValue && execution.dateValue > todayEnd ? nestedSummary.planned : nestedSummary.done;
          increaseSummaryStatus(nestedStatusSummary, execution);
          increaseSummaryStatus(nestedSummary.total, execution);
        }
        const priority = findPriority(execution.priority, prioritiesMap);
        if (priority) {
          let nestedSummary = executionsSummary.priorities[priority.key];
          if (!nestedSummary) {
            nestedSummary = newItemSummary();
            executionsSummary.priorities[priority.key] = nestedSummary;
          }
          const nestedStatusSummary = execution.dateValue && execution.dateValue > todayEnd ? nestedSummary.planned : nestedSummary.done;
          increaseSummaryStatus(nestedStatusSummary, execution);
          increaseSummaryStatus(nestedSummary.total, execution);
        }
      }
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
      if (project.rawPrice && project.rawPrice > 0) {
        baseSummary.missingEarnings = Math.max(project.rawPrice - baseSummary.done.earned, 0);
        baseSummary.earnedProgress = Math.min(baseSummary.done.earned / project.rawPrice, 1);
      }
      return baseSummary;
    });
  });
};

export const updateSummary = (hiveId, projectId) => {
  return calculateSummary(hiveId, projectId).then(baseSummary => {
    return admin.database().ref(`/hives/${hiveId}/projects/${projectId}/summary`).set(baseSummary).then(() => {
      return baseSummary;
    });
  });
};

export const updateSummaryWithPath = (projectPath) => {
  return admin.database().ref(projectPath).once('value').then(projectSnap => {
    const hiveId = projectSnap.ref.parent.parent.key;
    const projectId = projectSnap.key;
    return updateSummary(hiveId, projectId);
  });
};

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
    return promises.length === 0 ? [] : promiseSerial(promises.map(task => () => updateSummary(task.hiveId, task.projectId)));
  });
};