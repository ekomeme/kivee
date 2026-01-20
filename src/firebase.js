import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const envAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const runtimeAuthDomain =
  typeof window !== "undefined" && window.location.hostname.endsWith("kivee.app")
    ? window.location.hostname
    : envAuthDomain;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: runtimeAuthDomain || envAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Log environment info in development
if (import.meta.env.DEV) {
  const env = import.meta.env.VITE_ENV || 'development';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  console.log(`🔥 Firebase initialized in ${env.toUpperCase()} mode`);
  console.log(`📦 Project ID: ${projectId}`);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ensure persistence works across environments (Safari/Incógnito pueden bloquear indexedDB/localStorage)
export const authReady = setPersistence(auth, browserLocalPersistence)
  .catch(() => setPersistence(auth, browserSessionPersistence))
  .catch(() => setPersistence(auth, inMemoryPersistence))
  .catch(err => {
    console.error("[Auth] setPersistence failed", err);
  });
