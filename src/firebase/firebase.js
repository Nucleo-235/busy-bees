import * as firebase from 'firebase';

const prodConfig = {
  apiKey: "AIzaSyCoz8h8fCSy3G7nAO3ZHwWAc6dg40AhPDE",
  authDomain: "busybees-fe457.firebaseapp.com",
  databaseURL: "https://busybees-fe457.firebaseio.com",
  projectId: "busybees-fe457",
  storageBucket: "busybees-fe457.appspot.com",
  messagingSenderId: "682126920364"
};

const devConfig = {
  apiKey: "AIzaSyCoz8h8fCSy3G7nAO3ZHwWAc6dg40AhPDE",
  authDomain: "busybees-fe457.firebaseapp.com",
  databaseURL: "https://busybees-fe457.firebaseio.com",
  projectId: "busybees-fe457",
  storageBucket: "busybees-fe457.appspot.com",
  messagingSenderId: "682126920364",
};

const config = process.env.NODE_ENV === 'production'
  ? prodConfig
  : devConfig;

if (!firebase.apps.length) {
  firebase.initializeApp(config);
}

const db = firebase.database();
const auth = firebase.auth();

export {
  db,
  auth,
  firebase
};
