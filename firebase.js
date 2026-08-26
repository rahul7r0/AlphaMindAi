// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvcPINEX7JbBf0qhZNuhxlbMRPx4WypeQ",
  authDomain: "alphamind-ai-d6821.firebaseapp.com",
  projectId: "alphamind-ai-d6821",
  storageBucket: "alphamind-ai-d6821.firebasestorage.app",
  messagingSenderId: "850925659846",
  appId: "1:850925659846:web:ec7609935dec09f25f99c7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };