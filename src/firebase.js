import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAufJATkGZjbdhvle7srOVrghSuW9KfWg",
  authDomain: "kochi-health-finder.firebaseapp.com",
  projectId: "kochi-health-finder",
  storageBucket: "kochi-health-finder.firebasestorage.app",
  messagingSenderId: "203599371727",
  appId: "1:203599371727:web:f91f775e750d28cb5dc6ba",
  measurementId: "G-WH4DX9RYMJ"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);