// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJyMpWjsI-MT2ZPNTNaZTGzzaQpqEYiN8",
  authDomain: "ai-promt-data-base-eee03.firebaseapp.com",
  projectId: "ai-promt-data-base-eee03",
  storageBucket: "ai-promt-data-base-eee03.firebasestorage.app",
  messagingSenderId: "745912983857",
  appId: "1:745912983857:web:920da9b62537e0245e1010",
  measurementId: "G-7JJ00WSCZV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
