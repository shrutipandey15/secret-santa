import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBjAY9qAykd-XmAGVIVOWbKdCvQ5EjB0K0",
  authDomain: "secret-santa-a420c.firebaseapp.com",
  databaseURL: "https://secret-santa-a420c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "secret-santa-a420c",
  storageBucket: "secret-santa-a420c.firebasestorage.app",
  messagingSenderId: "159389974746",
  appId: "1:159389974746:web:918ba9db01364494dfa5e3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);