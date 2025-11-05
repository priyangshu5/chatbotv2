// Initialize the application
import { initializeAuth } from './auth.js';
import { initializeModelSelector } from './models.js';
import { initializeChat } from './chat.js';
import { initializeImageHandler } from './image-handler.js';

console.log('🚀 Starting application initialization...');

// Global screen management
window.showScreen = function(screenId) {
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
};

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM loaded, initializing application...');
    
    try {
        // Show loading screen initially
        showScreen('loading-screen');
        
        // Wait a bit to show loading animation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Initialize authentication
        console.log('🔐 Initializing authentication...');
        await initializeAuth();
        
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});

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
                <div style="margin-top: 1rem; font-size: 0.9rem; color: #ccc;">
                    Check browser console for details
                </div>
                <button onclick="window.location.reload()" class="btn-primary" style="margin-top: 1rem;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// Initialize chat components when user is authenticated
window.initializeChatComponents = function() {
    console.log('💬 Initializing chat components...');
    try {
        initializeModelSelector();
        initializeChat();
        initializeImageHandler();
        console.log('✅ Chat components initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize chat components:', error);
    }
};

// Global error handlers
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// Setup sidebar toggle
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
    
    // Close sidebar when clicking on a chat item on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(event.target) && 
                !sidebarToggle.contains(event.target) &&
                event.target.closest('.chat-item')) {
                sidebar.classList.remove('open');
            }
        }
    });
});
