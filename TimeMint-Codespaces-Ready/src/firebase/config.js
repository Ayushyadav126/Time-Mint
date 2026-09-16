import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_ywnzdLeaJPpsFGF9qUzuJ_EhPGfJP9s",
  authDomain: "time-mint.firebaseapp.com",
  projectId: "time-mint",
  storageBucket: "time-mint.firebasestorage.app",
  messagingSenderId: "276985559632",
  appId: "1:276985559632:web:bf80e9547a27a9a7d3af55",
  measurementId: "G-SF85EVZKBX"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export Firestore database and Auth instances
export const db = getFirestore(app);
export const auth = getAuth(app);
