import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyBOgfYFGxaVHe5D5j8njbyD7UFlHKoqA",
  authDomain: "qedi-asset-register.firebaseapp.com",
  projectId: "qedi-asset-register",
  storageBucket: "qedi-asset-register.firebasestorage.app",
  messagingSenderId: "459402833098",
  appId: "1:459402833098:web:48f037bc619e2d8dda1833"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.FIREBASE = {
  app,
  auth,
  db,
  firestore: {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    addDoc,
    updateDoc,
    serverTimestamp
  },
  authMethods: {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
  }
};

export function initFirebase() {
  return window.FIREBASE;
}
