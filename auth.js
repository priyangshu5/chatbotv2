import { auth, database } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');

// Toggle between login and signup forms
showSignup.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
});

// Sign Up
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save user profile
    await set(ref(database, 'users/' + user.uid), {
      name: name,
      email: email,
      createdAt: new Date().toISOString()
    });
    
    console.log('User created successfully');
  } catch (error) {
    console.error('Error signing up:', error);
    alert('Error creating account: ' + error.message);
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('User logged in successfully');
  } catch (error) {
    console.error('Error logging in:', error);
    alert('Error logging in: ' + error.message);
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
});

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is signed in
    authScreen.classList.remove('active');
    chatScreen.classList.add('active');
    
    // Get user data
    try {
      const userRef = ref(database, 'users/' + user.uid);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        userNameSpan.textContent = userData.name;
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
  } else {
    // User is signed out
    authScreen.classList.add('active');
    chatScreen.classList.remove('active');
    
    // Reset forms
    loginForm.reset();
    signupForm.reset();
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
  }
});
