import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDwJ9cVPfhr90RBRtXnfz21Ms3nD5yIP3s",
  authDomain: "tokplayv9.firebaseapp.com",
  projectId: "tokplayv9",
  storageBucket: "tokplayv9.firebasestorage.app",
  messagingSenderId: "801686020791",
  appId: "1:801686020791:web:992d781d55b75b62fba332",
  measurementId: "G-F04H2GNE54"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
