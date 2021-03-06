import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';

admin.initializeApp(functions.config().firebase);

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

import * as projectProvider from './providers/project';
import * as projectSummaryProvider from './providers/project-summary';
import * as executionProvider from './providers/execution';
import * as scheduleProvider from './providers/schedule';
import * as emailProvider from './providers/email';

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
      return projectSummaryProvider.updateSummaryWithPath(project.parentProject).then(() => true);
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
    promises.push(projectSummaryProvider.updateSummary(hiveId, execution.project));
  }
  return Promise.all(promises);
});

const { firebaseAuthServer } = require('./default-server/firebase-auth-server');

const httpPublicApp = firebaseAuthServer.setupOptional();
httpPublicApp.get('/hives/:hiveId/projects/:id/summary', (req, res) => {
  const hiveId = req.params.hiveId;
  const projectId = req.params.id;
  if (projectId && projectId.length > 0) {
    projectSummaryProvider.calculateSummary(hiveId, projectId).then(summary => {
      res.status(200).send(summary);
    }, error => {
      res.status(500).send({ error: error });
    });
  } else {
    res.status(500).send({ error: "no project id" });
  }
});


httpPublicApp.get('/hives/:hiveId/projects/:id/transfer/:newid', (req, res) => {
  const hiveId = req.params.hiveId;
  const projectId = req.params.id;
  const projectNewId = req.params.newid;
  admin.database().ref(`/hives/${hiveId}/executions`).orderByChild('project').equalTo(projectId).once('value').then(executionsSnaps => {
    const promises = [];
    executionsSnaps.forEach(executionSnap => {
      promises.push(admin.database().ref(`/hives/${hiveId}/executions/${executionSnap.key}`).update({ project: projectNewId}));
    })
    return Promise.all(promises).then(results => {
      res.status(200).send(results);
    }, error => {
      res.status(500).send({ error: error });
    })
  }, error => {
    res.status(500).send({ error: error });
  });
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

httpPublicApp.get('/hives/:hiveId/email/last-month-projects', (req, res) => {
  const hiveId = req.params.hiveId;
  const dateReference = moment().subtract(1, 'months').startOf('month').toDate();
  projectProvider.listMonthProjects(hiveId).then(projects => {
    const monthProjectsPromises = [];
    for (const project of projects) {
      if (!project.period || project.period === 'month') {
        const promises = [];
        promises.push(projectSummaryProvider.calculateSummary(hiveId, project.key, dateReference));
        promises.push(projectSummaryProvider.listProjectExecutions(hiveId, project.key, dateReference));
        promises.push(projectProvider.finalProjectPriorities(hiveId, project.key));
        monthProjectsPromises.push(Promise.all(promises).then(projectResults => {
          const summary = projectResults[0];
          if (summary.done && summary.done.hours > 0) {
            return emailProvider.sendMonthEmail(project, summary, projectResults[1], dateReference, projectResults[2]);
          } else {
            return true;
          }
        }));
      }
    }
    return Promise.all(monthProjectsPromises).then(results => {
      res.status(200).send({ emailsSent: results.length });
    }, error => {
      console.log(error)
      res.status(500).send({ error: error });
    })
  }, error => {
    res.status(500).send({ error: error });
  });
});


httpPublicApp.get('/cron/rebuild/summary', (req, res) => {
  projectSummaryProvider.updateAllSummaries().then(summary => {
    res.status(200).send({ updated: summary.length });
  }, error => {
    console.log(error);
    res.status(500).send({ error: error });
  });
});
exports.publicApp = functions.https.onRequest(httpPublicApp);

