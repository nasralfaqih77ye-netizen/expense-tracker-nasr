import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB9OgxLvQ1B3-1Rq_bwIygy7QT3zVy4EEw",
  authDomain: "expense-tracker-d20d0.firebaseapp.com",
  projectId: "expense-tracker-d20d0",
  storageBucket: "expense-tracker-d20d0.firebasestorage.app",
  messagingSenderId: "912163177434",
  appId: "1:912163177434:web:14a2c060f0efff375f76e3"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const authReady = signInAnonymously(auth);