// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Estas são as suas chaves reais do projeto "sua-oab" que usámos na versão HTML
const firebaseConfig = {
  apiKey: "AIzaSyCehVsV95Nco_JwNAAlRXN_uBmj4ABrK7Q",
  authDomain: "sua-oab.firebaseapp.com",
  projectId: "sua-oab",
  storageBucket: "sua-oab.firebasestorage.app",
  messagingSenderId: "836393880788",
  appId: "1:836393880788:web:02480dea9fb69145de3f41"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);