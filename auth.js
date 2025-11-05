import { auth, database } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

console.log('🔐 Auth module loaded');

let authInitialized = false;

export async function initializeAuth() {
    if (authInitialized) {
        console.log('🔐 Auth already initialized');
        return;
    }

    console.log('🔄 Initializing authentication system...');
    
    try {
        // Setup auth state listener
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                console.log('🔑 Auth state changed:', user ? `User: ${user.email}` : 'No user');
                
                if (user) {
                    // User is signed in
                    await handleUserSignedIn(user);
                } else {
                    // User is signed out
                    showAuthScreen();
                }
                resolve();
            });
        });
        
    } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        showAuthScreen();
        throw error;
    }
}

// DOM Elements
function getAuthElements() {
    return {
        authScreen: document.getElementById('auth-screen'),
        chatScreen: document.getElementById('chat-screen'),
        loginForm: document.getElementById('login-form'),
        signupForm: document.getElementById('signup-form'),
        showSignup: document.getElementById('show-signup'),
        showLogin: document.getElementById('show-login'),
        logoutBtn: document.getElementById('logout-btn'),
        userNameSpan: document.getElementById('user-name')
    };
}

// Toggle between login and signup forms
function setupFormToggles() {
    const { showSignup, showLogin, loginForm, signupForm } = getAuthElements();
    
    if (showSignup) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (signupForm) signupForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
        });
    }
}

// Sign Up
function setupSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        
        console.log('📝 Sign up attempt:', { name, email });
        
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
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Creating Account...';
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        try {
            console.log('🔥 Creating user with Firebase Auth...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('✅ User created successfully:', user.uid);
            
            // Save user profile to Realtime Database
            console.log('💾 Saving user profile to database...');
            await set(ref(database, 'users/' + user.uid), {
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            
            console.log('✅ User profile saved successfully');
            
        } catch (error) {
            console.error('❌ Error signing up:', error);
            
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
            if (submitBtn) {
                submitBtn.querySelector('.btn-text').textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }
    });
}

// Login
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        console.log('🔑 Login attempt:', { email });
        
        // Basic validation
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        const submitBtn = loginForm.querySelector('button');
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Signing In...';
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        try {
            console.log('🔥 Signing in with Firebase Auth...');
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('✅ User signed in successfully:', user.uid);
            
            // Update last login time
            await set(ref(database, 'users/' + user.uid + '/lastLogin'), new Date().toISOString());
            
            console.log('✅ Last login time updated');
            
        } catch (error) {
            console.error('❌ Error logging in:', error);
            
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
        } finally {
            if (submitBtn) {
                submitBtn.querySelector('.btn-text').textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }
    });
}

// Logout
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        try {
            console.log('🚪 Logging out...');
            await signOut(auth);
            console.log('✅ User logged out successfully');
        } catch (error) {
            console.error('❌ Error signing out:', error);
        }
    });
}

// Handle user signed in
async function handleUserSignedIn(user) {
    console.log('👤 User signed in:', user.email);
    
    const { authScreen, chatScreen, userNameSpan } = getAuthElements();
    
    // Switch to chat screen
    if (authScreen) authScreen.classList.remove('active');
    if (chatScreen) chatScreen.classList.add('active');
    
    // Get user data from database
    try {
        console.log('📊 Fetching user data from database...');
        const userRef = ref(database, 'users/' + user.uid);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('✅ User data found:', userData);
            if (userNameSpan) {
                userNameSpan.textContent = userData.name || user.email || 'User';
            }
        } else {
            console.log('ℹ️ No user data found, creating default...');
            // Create default user data
            await set(ref(database, 'users/' + user.uid), {
                name: user.displayName || 'User',
                email: user.email,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            if (userNameSpan) {
                userNameSpan.textContent = user.displayName || user.email || 'User';
            }
        }
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        if (userNameSpan) {
            userNameSpan.textContent = user.email || 'User';
        }
    }
    
    // Initialize chat components
    if (window.initializeChatComponents) {
        window.initializeChatComponents();
    }
}

// Show auth screen
function showAuthScreen() {
    console.log('🔓 Showing auth screen');
    
    const { authScreen, chatScreen, loginForm, signupForm } = getAuthElements();
    
    if (authScreen) authScreen.classList.add('active');
    if (chatScreen) chatScreen.classList.remove('active');
    
    // Reset forms
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
    
    // Auto-fill test credentials for easier testing
    setTimeout(() => {
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        const signupName = document.getElementById('signup-name');
        const signupEmail = document.getElementById('signup-email');
        const signupPassword = document.getElementById('signup-password');
        
        if (loginEmail && loginPassword) {
            loginEmail.value = 'test@priyangshu.com';
            loginPassword.value = 'password123';
        }
        
        if (signupName && signupEmail && signupPassword) {
            signupName.value = 'Test User';
            signupEmail.value = 'test@priyangshu.com';
            signupPassword.value = 'password123';
        }
    }, 1000);
}

// Initialize all auth components
function initializeAuthComponents() {
    console.log('🛠️ Setting up auth components...');
    setupFormToggles();
    setupSignupForm();
    setupLoginForm();
    setupLogout();
    authInitialized = true;
    console.log('✅ Auth components initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthComponents);
} else {
    initializeAuthComponents();
    }
