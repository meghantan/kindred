// library/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdf6HqJyvFSQmTjZxCSnFVVYBeYoacAJ8",
  authDomain: "kindred-2eb86.firebaseapp.com",
  projectId: "kindred-2eb86",
  storageBucket: "kindred-2eb86.firebasestorage.app",
  messagingSenderId: "779090543811",
  appId: "1:779090543811:web:a391b2fd54d74342c7ce76",
  measurementId: "G-794LPB5MDF"
};

// Initialise Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);