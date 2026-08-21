import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCFbWB0255QmkO55gvMwRZZzdq0Wi4bZYw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'hesics-os.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'hesics-os',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'hesics-os.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '606823605321',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:606823605321:web:d4fa56c9fc7326f9708b98',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-B9ZMJWRC8Q'
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let dbInstance: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    dbInstance = getFirestore(app);
    storage = getStorage(app);

    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {
        // Analytics not supported in this environment
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase SDK:', error);
  }
}

export { app, auth, dbInstance, storage, analytics };
