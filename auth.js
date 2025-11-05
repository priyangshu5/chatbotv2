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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save user profile
    await set(ref(database, 'users/' + user.uid), {
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
    
    console.log('User created successfully');
    
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
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update last login time
    await set(ref(database, 'users/' + user.uid + '/lastLogin'), new Date().toISOString());
    
    console.log('User logged in successfully');
    
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
        errorMessage += 'Please check your email and password.';
    }
    
    alert(errorMessage);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
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

// Auth State Observer - THIS IS THE KEY FIX
onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed - User:', user);
  
  if (user) {
    // User is signed in
    console.log('User is signed in:', user.email);
    
    // Switch screens
    authScreen.classList.remove('active');
    chatScreen.classList.add('active');
    
    // Get user data
    try {
      const userRef = ref(database, 'users/' + user.uid);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        userNameSpan.textContent = userData.name || user.email || 'User';
      } else {
        // Create user data if it doesn't exist
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
    console.log('User is signed out');
    authScreen.classList.add('active');
    chatScreen.classList.remove('active');
    
    // Reset forms
    loginForm.reset();
    signupForm.reset();
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
  }
});

// Auto-create test user for easy testing
async function createTestUser() {
  const testEmail = 'test@priyangshu.com';
  const testPassword = 'password123';
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    await set(ref(database, 'users/' + userCredential.user.uid), {
      name: 'Test User',
      email: testEmail,
      createdAt: new Date().toISOString()
    });
    console.log('Test user created successfully');
    
    // Auto-fill the login form
    document.getElementById('login-email').value = testEmail;
    document.getElementById('login-password').value = testPassword;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Test user already exists');
      // Auto-fill the login form
      document.getElementById('login-email').value = testEmail;
      document.getElementById('login-password').value = testPassword;
    }
  }
}

// Uncomment the line below to automatically create a test user
// createTestUser();
