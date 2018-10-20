// import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';

import { getPriorities } from '../shared/models/priority';

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

export const finalProjectPriorities = (hiveId, projectId) => {
  return Promise.all([
    admin.database().ref(`/hives/${hiveId}/priorities`).once('value'),
    admin.database().ref(`/hives/${hiveId}/project/${projectId}/priorities`).once('value')
  ]).then(results => {
    return getPriorities(results[0].val(), results[1].val());
  })
  
};

export const listProjects = (projectsKeys) : Promise<any[]> => {
  const promises = [];
  for (const keys of projectsKeys) {
    promises.push(admin.database().ref(`/hives/${keys.hive}/projects/${keys.project}`).once('value'));
  }
  return promises.length === 0 ? Promise.resolve([]) : Promise.all(promises);
};

export const listMonthProjects = (hiveKey) : Promise<any[]> => {
  return admin.database().ref(`/hives/${hiveKey}/projects`).orderByChild("type").equalTo('recurrent').once('value').then(snapsResult => {
    const results = [];
    snapsResult.forEach(projectSnap => {
      const project = projectSnap.val();
      project.key = projectSnap.key;
      results.push(project);
    });
    return results;
  });
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
  if (project.taxPct && project.rawPrice) {
    const price = (project.rawPrice * (1 - project.taxPct)) - (project.sharedPrice ? project.sharedPrice : 0);
    if (!project.price || project.price !== price) {
      project.price = price;
      newValues.price = price;
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