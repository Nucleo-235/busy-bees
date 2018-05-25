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

export const projectCreated = functions.database.ref('/projects/{projectId}').onCreate(event => {
  // const projectId = event.params.projectId;
  // const project = event.data.val();
  return true;
});

export const projectSummaryWritten = functions.database.ref('/projects/{projectId}/summary').onWrite(event => {
  const projectId = event.params.projectId;
  const projectSummary = event.data.val();
  return admin.database().ref(`/projects/${projectId}`).once('value').then(projectSnap => {
    const project = projectSnap.val();
    if (!project)
      return false;

    if (project.parentProject) {
      return projectProvider.updateSummary(project.parentProject);
    } else {
      return true;
    }
  });
});

export const projectExecutionWritten = functions.database.ref('/executions/{executionId}').onWrite(event => {
  // const executionId = event.params.executionId;
  const execution = event.data.val();

  if (execution && execution.project) {
    return projectProvider.updateSummary(execution.project);
  } else {
    return false;
  }
});

const { firebaseAuthServer } = require('./default-server/firebase-auth-server');

const httpPublicApp = firebaseAuthServer.setupOptional();
httpPublicApp.get('/projects/:id/summary', (req, res) => {
  const projectId = req.params.id;
  if (projectId && projectId.length > 0) {
    projectProvider.updateSummary(projectId).then(summary => {
      res.status(200).send(summary);
    }, error => {
      res.status(500).send({ error: error });
    });
  } else {
    res.status(500).send({ error: "no project id" });
  }
});

exports.publicApp = functions.https.onRequest(httpPublicApp);

