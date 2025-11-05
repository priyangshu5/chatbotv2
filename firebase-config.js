import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAErIdoimN-ToraXriaChwTQi_RFmOarmM",
  authDomain: "bablu-14de4.firebaseapp.com",
  databaseURL: "https://bablu-14de4-default-rtdb.firebaseio.com",
  projectId: "bablu-14de4",
  storageBucket: "bablu-14de4.firebasestorage.app",
  messagingSenderId: "792223764805",
  appId: "1:792223764805:web:ea92567320647b1a48ee2c",
  measurementId: "G-N2LH7Z3XK0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };
