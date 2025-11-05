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

// Error message element
const errorMessage = document.createElement('div');
errorMessage.className = 'error-message';
errorMessage.style.cssText = `
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
  display: none;
`;

// Add error message to forms
document.querySelector('#login-form form').prepend(errorMessage.cloneNode());
document.querySelector('#signup-form form').prepend(errorMessage.cloneNode());

function showError(form, message) {
  const errorEl = form.querySelector('.error-message');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 5000);
}

function hideError(form) {
  const errorEl = form.querySelector('.error-message');
  errorEl.style.display = 'none';
}

// Toggle between login and signup forms
showSignup.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
  hideError(signupForm);
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  hideError(loginForm);
});

// Sign Up
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  
  // Basic validation
  if (!name || !email || !password) {
    showError(signupForm, 'Please fill in all fields');
    return;
  }
  
  if (password.length < 6) {
    showError(signupForm, 'Password must be at least 6 characters long');
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
    hideError(signupForm);
    
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
      default:
        errorMessage += error.message;
    }
    
    showError(signupForm, errorMessage);
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
    showError(loginForm, 'Please enter both email and password');
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
    hideError(loginForm);
    
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
        errorMessage += 'No account found with this email.';
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
      default:
        errorMessage += 'Please check your email and password.';
    }
    
    showError(loginForm, errorMessage);
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
        userNameSpan.textContent = userData.name || 'User';
      } else {
        // Create user data if it doesn't exist
        await set(ref(database, 'users/' + user.uid), {
          name: 'User',
          email: user.email,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
        userNameSpan.textContent = 'User';
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      userNameSpan.textContent = 'User';
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
    
    // Clear errors
    hideError(loginForm);
    hideError(signupForm);
  }
});

// Auto-focus on email field when switching forms
showSignup.addEventListener('click', () => {
  setTimeout(() => {
    document.getElementById('signup-email').focus();
  }, 100);
});

showLogin.addEventListener('click', () => {
  setTimeout(() => {
    document.getElementById('login-email').focus();
  }, 100);
});
