// Initialize the application
import { initializeAuth } from './auth.js';

console.log('🚀 Starting application initialization...');

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM loaded, initializing application...');
    
    try {
        // Show loading screen initially
        showScreen('loading-screen');
        
        // Initialize authentication
        console.log('🔐 Initializing authentication...');
        await initializeAuth();
        
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});

// Screen management functions
export function showScreen(screenId) {
    console.log('🔄 Switching to screen:', screenId);
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    } else {
        console.error('Screen not found:', screenId);
    }
}

// Error handling
function showError(message) {
    console.error('💥 Error:', message);
    
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h2>Initialization Error</h2>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn-primary">
                    Reload Page
                </button>
            </div>
        `;
        
        // Add error styles
        const style = document.createElement('style');
        style.textContent = `
            .error-container {
                text-align: center;
                padding: 2rem;
                background: rgba(247, 118, 142, 0.1);
                border: 1px solid rgba(247, 118, 142, 0.3);
                border-radius: 16px;
                max-width: 400px;
                margin: 0 auto;
            }
            .error-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// Make showScreen available globally
window.showScreen = showScreen;
