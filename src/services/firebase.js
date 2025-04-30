// Use the modular style imports
import { initializeApp, getApps, getApp } from '@react-native-firebase/app';

const firebaseConfig = {
    apiKey: "AIzaSyBA-bG3Zl9niHPqeegqRoiOY9ohjnHH88w",
    authDomain: "mycommuty-98b42.firebaseapp.com",
    projectId: "mycommuty-98b42",
    storageBucket: "mycommuty-98b42.firebasestorage.app",
    messagingSenderId: "275984481430",
    appId: "1:275984481430:web:9ed82116fe805109a7d6b7",
    measurementId: "G-40NVWSC5FF"
  };

const initializeFirebase = () => {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase already initialized!');
  }
};

export default initializeFirebase;



