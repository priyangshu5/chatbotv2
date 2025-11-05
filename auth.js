import { auth, database } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');

console.log('Auth module loaded');

// Test Firebase connection immediately
console.log('Testing Firebase connection...');
console.log('Auth object:', auth);
console.log('Database object:', database);

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
  
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  
  console.log('Sign up attempt:', { name, email, password });
  
  // Basic validation
  if (!name || !email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters long');
    return;
  }
  
  const submitBtn = signupForm.querySelector('button');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Creating Account...';
  submitBtn.disabled = true;
  
  try {
    console.log('Creating user with Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User created successfully:', user.uid);
    
    // Save user profile to Realtime Database
    console.log('Saving user profile to database...');
    await set(ref(database, 'users/' + user.uid), {
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
    
    console.log('User profile saved successfully');
    
    // Don't switch screens here - let onAuthStateChanged handle it
    
  } catch (error) {
    console.error('Error signing up:', error);
    
    let errorMessage = 'Error creating account. ';
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage += 'This email is already registered.';
        break;
      case 'auth/invalid-email':
        errorMessage += 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessage += 'Password is too weak.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage += 'Email/password accounts are not enabled. Please contact support.';
        break;
      default:
        errorMessage += error.message;
    }
    
    alert(errorMessage);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  console.log('Login attempt:', { email, password });
  
  // Basic validation
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }
  
  const submitBtn = loginForm.querySelector('button');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Signing In...';
  submitBtn.disabled = true;
  
  try {
    console.log('Signing in with Firebase Auth...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User signed in successfully:', user.uid);
    
    // Update last login time
    await set(ref(database, 'users/' + user.uid + '/lastLogin'), new Date().toISOString());
    
    console.log('Last login time updated');
    
    // Don't switch screens here - let onAuthStateChanged handle it
    
  } catch (error) {
    console.error('Error logging in:', error);
    
    let errorMessage = 'Login failed. ';
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage += 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage += 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage += 'No account found with this email. Please sign up first.';
        break;
      case 'auth/wrong-password':
        errorMessage += 'Incorrect password.';
        break;
      case 'auth/invalid-login-credentials':
        errorMessage += 'Invalid email or password. Please check your credentials.';
        break;
      case 'auth/too-many-requests':
        errorMessage += 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        errorMessage += 'Network error. Please check your internet connection.';
        break;
      default:
        errorMessage += error.message;
    }
    
    alert(errorMessage);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    console.log('Logging out...');
    await signOut(auth);
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Error signing out:', error);
  }
});

// AUTH STATE LISTENER - This is the key to everything
console.log('Setting up auth state listener...');
onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed! Current user:', user);
  
  if (user) {
    // User is signed in
    console.log('✅ User is signed in:', user.email);
    
    // Switch to chat screen
    authScreen.classList.remove('active');
    chatScreen.classList.add('active');
    
    // Reset button states
    const loginBtn = loginForm.querySelector('button');
    const signupBtn = signupForm.querySelector('button');
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled = false;
    signupBtn.textContent = 'Create Account';
    signupBtn.disabled = false;
    
    // Get user data from database
    try {
      console.log('Fetching user data from database...');
      const userRef = ref(database, 'users/' + user.uid);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log('User data found:', userData);
        userNameSpan.textContent = userData.name || user.email || 'User';
      } else {
        console.log('No user data found, creating default...');
        // Create default user data
        await set(ref(database, 'users/' + user.uid), {
          name: user.displayName || 'User',
          email: user.email,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
        userNameSpan.textContent = user.displayName || user.email || 'User';
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      userNameSpan.textContent = user.email || 'User';
    }
  } else {
    // User is signed out
    console.log('❌ User is signed out');
    authScreen.classList.add('active');
    chatScreen.classList.remove('active');
    
    // Reset forms
    loginForm.reset();
    signupForm.reset();
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
  }
});

// Auto-create test user for debugging
async function createTestUser() {
  const testEmail = 'test@priyangshu.com';
  const testPassword = 'password123';
  
  try {
    console.log('Creating test user...');
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    await set(ref(database, 'users/' + userCredential.user.uid), {
      name: 'Test User',
      email: testEmail,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Test user created successfully');
    
    // Auto-fill the login form
    document.getElementById('login-email').value = testEmail;
    document.getElementById('login-password').value = testPassword;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️ Test user already exists');
      // Auto-fill the login form
      document.getElementById('login-email').value = testEmail;
      document.getElementById('login-password').value = testPassword;
    } else {
      console.error('❌ Error creating test user:', error);
    }
  }
}

// Create test user automatically (remove this in production)
setTimeout(() => {
  console.log('Attempting to create test user...');
  createTestUser();
}, 2000);
