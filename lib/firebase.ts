import { initializeApp, FirebaseApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase with error handling
let app: FirebaseApp | undefined;

// Only initialize if we have the required configuration
if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your_firebase_api_key_here') {
  try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
} else {
  console.warn('Firebase configuration not found. Analytics will be disabled.');
  console.warn('To enable analytics, add your Firebase configuration to .env.local');
}

export { app };