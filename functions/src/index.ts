import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

import * as projectProvider from './providers/project';
import * as executionProvider from './providers/execution';
import * as scheduleProvider from './providers/schedule';

export const projectCreated = functions.database.ref('/hives/{hiveId}/projects/{projectId}').onCreate(event => {
  // const projectId = event.params.projectId;
  // const project = event.data.val();
  return true;
});

export const projectWritten = functions.database.ref('/hives/{hiveId}/projects/{projectId}').onWrite(event => {
  const hiveId = event.params.hiveId;
  const projectId = event.params.projectId;
  const project = event.data.val();
  return projectProvider.checkCalculatedValues(hiveId, projectId, project);
});

export const projectParentChanged = functions.database.ref('/hives/{hiveId}/projects/{projectId}/parentProject').onWrite(event => {
  const hiveId = event.params.hiveId;
  const projectId = event.params.projectId;
  const parentProjectPath = event.data.val();
  return projectProvider.cacheProjectParent(hiveId, projectId, parentProjectPath);
});

export const projectSummaryWritten = functions.database.ref('/hives/{hiveId}/projects/{projectId}/summary').onWrite(event => {
  const hiveId = event.params.hiveId;
  const projectId = event.params.projectId;
  // const projectSummary = event.data.val();
  const projectPath = `/hives/${hiveId}/projects/${projectId}`;
  return admin.database().ref(projectPath).once('value').then(projectSnap => {
    const project = projectSnap.val();
    if (!project)
      return false;

    if (project.parentProject) {
      if (project.parentHive)
        return projectProvider.updateSummary(project.parentHive, project.parentProject).then(() => true);
      else
        return projectProvider.updateSummary(hiveId, project.parentProject).then(() => true);
    } else {
      return true;
    }
  });
});

export const projectExecutionWritten = functions.database.ref('/hives/{hiveId}/executions/{executionId}').onWrite(event => {
  // const executionId = event.params.executionId;
  const hiveId = event.params.hiveId;
  const executionId = event.params.executionId;
  const execution = event.data.val();

  const promises = [];
  promises.push(executionProvider.checkDate(hiveId, executionId, execution));
  promises.push(scheduleProvider.executionToSchedule(hiveId, executionId, execution));

  if (execution && execution.project) {
    promises.push(projectProvider.updateSummary(hiveId, execution.project));
  }
  return Promise.all(promises);
});

const { firebaseAuthServer } = require('./default-server/firebase-auth-server');

const httpPublicApp = firebaseAuthServer.setupOptional();
httpPublicApp.get('/hives/:hiveId/projects/:id/summary', (req, res) => {
  const hiveId = req.params.hiveId;
  const projectId = req.params.id;
  if (projectId && projectId.length > 0) {
    projectProvider.updateSummary(hiveId, projectId).then(summary => {
      res.status(200).send(summary);
    }, error => {
      res.status(500).send({ error: error });
    });
  } else {
    res.status(500).send({ error: "no project id" });
  }
});

httpPublicApp.get('/hives/:hiveId/executions/checkDates', (req, res) => {
  const hiveId = req.params.hiveId;
  admin.database().ref(`/hives/${hiveId}/executions`).once('value').then(executionsSnap => {
    const promises = [];
    executionsSnap.forEach(executionSnap => {
      const execution = executionSnap.val();
      promises.push(executionProvider.checkDate(hiveId, executionSnap.key, execution));
    });
    Promise.all(promises).then(results => {
      res.status(200).send(results);
    }, error => {
      res.status(500).send({ error: error });
    })
  }, error => {
    res.status(500).send({ error: error });
  });
});

httpPublicApp.get('/hives/:hiveId/schedules/rebuild', (req, res) => {
  const hiveId = req.params.hiveId;
  scheduleProvider.executionsToSchedules(hiveId).then(results => {
    res.status(200).send(results);
  }, error => {
    res.status(500).send({ error: error });
  });
});

httpPublicApp.get('/cron/rebuild/summary', (req, res) => {
  projectProvider.updateAllSummaries().then(summary => {
    res.status(200).send(summary);
  }, error => {
    res.status(500).send({ error: error });
  });
});

exports.publicApp = functions.https.onRequest(httpPublicApp);

