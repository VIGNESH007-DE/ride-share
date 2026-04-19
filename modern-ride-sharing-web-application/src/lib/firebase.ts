import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These should be replaced with actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdQz4N6MfLHieI5JYBHjdRrKXyYEsf-OM",
  authDomain: "wayback-a31a2.firebaseapp.com",
  projectId: "wayback-a31a2",
  storageBucket: "wayback-a31a2.firebasestorage.app",
  messagingSenderId: "1071532786218",
  appId: "1:1071532786218:web:e727812ba851940f553953",
  measurementId: "G-FG9SD1ZFD1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
