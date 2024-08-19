const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCLcYXtmA56RMIR0fF3L1x1EhBm7eW1wpQ",
  authDomain: "bot-teleivan.firebaseapp.com",
  projectId: "bot-teleivan",
  storageBucket: "bot-teleivan.appspot.com",
  messagingSenderId: "495418950478",
  appId: "1:495418950478:web:598d8f3cf06106b6e1541f",
  measurementId: "G-YR5X00HK0J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db, collection, addDoc, getDocs, doc, setDoc, deleteDoc, Timestamp };
