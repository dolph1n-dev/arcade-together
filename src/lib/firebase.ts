import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {

  apiKey: "AIzaSyAg54G3hhoWDniL5TkWfhdecNIKz0hgVPE",

  authDomain: "arcade-together.firebaseapp.com",

  databaseURL: "https://arcade-together-default-rtdb.europe-west1.firebasedatabase.app",

  projectId: "arcade-together",

  storageBucket: "arcade-together.firebasestorage.app",

  messagingSenderId: "955636991521",

  appId: "1:955636991521:web:a7c88007830bcabe234560",

  measurementId: "G-FWQN2P3ET7"

};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);