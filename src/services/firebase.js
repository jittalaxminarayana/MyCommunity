import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBA-bG3Zl9niHPqeegqRoiOY9ohjnHH88w",
  authDomain: "mycommuty-98b42.firebaseapp.com",
  projectId: "mycommuty-98b42",
  storageBucket: "mycommuty-98b42.appspot.com",
  messagingSenderId: "275984481430",
  appId: "1:275984481430:web:9ed82116fe805109a7d6b7",
  measurementId: "G-40NVWSC5FF"
};

let app;

const initializeFirebase = () => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized');
  } else {
    app = getApp();
  }
};

export default initializeFirebase;
export const functions = () => getFunctions(app);
