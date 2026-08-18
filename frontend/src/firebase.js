import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATrTMUYUQQYVASezplhFcNr09K3Q0onQQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bill-splitter-54359.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bill-splitter-54359",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bill-splitter-54359.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "488654445848",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:488654445848:web:acc2ae06df98939d42126d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-D08YFGYMMW"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('DemoDummy')
  );
};

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
};

export default app;
