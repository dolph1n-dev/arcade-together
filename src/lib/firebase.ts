import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAg54G3hhoWDniL5TkWfhdecNIKz0hgVPE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "arcade-together.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://arcade-together-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "arcade-together",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "arcade-together.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "955636991521",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:955636991521:web:a7c88007830bcabe234560",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FWQN2P3ET7"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
