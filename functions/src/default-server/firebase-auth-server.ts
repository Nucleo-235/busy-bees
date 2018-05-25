const functions = require('firebase-functions');
const admin = require('firebase-admin');

const express = require('express');
const cookieParser = require('cookie-parser')();
const cors = require('cors')({origin: true});

const validateFirebaseIdToken = (req, res, next) => {
  // console.log('Check if request is authorized with Firebase ID token');
  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) && !req.cookies.__session) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
    'Make sure you authorize your request by providing the following HTTP header:',
    'Authorization: Bearer <Firebase ID Token>',
    'or by passing a "__session" cookie.');
    res.status(403).send('Unauthorized');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  }

  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    // console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    next();
  }).catch(error => {
    console.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
  });
};

const validateFirebaseIdTokenOptional = (req, res, next) => {
  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  }

  if (idToken) {
    console.log('Found "token" cookie');
    admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
      // console.log('ID Token correctly decoded', decodedIdToken);
      req.user = decodedIdToken;
      next();
    }).catch(error => {
      console.log('Error while verifying Firebase ID token:', error);
      // res.status(403).send('Unauthorized');
      next();
    });
  } else {
    next();
  }
};

const firebaseAuthServer = {
  setup: function() {
      const serverApp = express();

      serverApp.use(cors);
      serverApp.use(cookieParser);
      serverApp.use(validateFirebaseIdToken);

      return serverApp;
  },
  setupOptional: function() {
      const serverApp = express();

      serverApp.use(cors);
      serverApp.use(cookieParser);
      serverApp.use(validateFirebaseIdTokenOptional);

      return serverApp;
  }
};

module.exports = { firebaseAuthServer, validateFirebaseIdToken, validateFirebaseIdTokenOptional };