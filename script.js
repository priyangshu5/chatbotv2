import { initializeModelSelector } from './models.js';
import { initializeChat } from './chat.js';
import { initializeImageHandler } from './image-handler.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen first
    const loadingScreen = document.getElementById('loading-screen');
    const authScreen = document.getElementById('auth-screen');
    
    // Simulate loading time
    setTimeout(() => {
        loadingScreen.classList.remove('active');
        authScreen.classList.add('active');
        
        // Initialize components after loading
        initializeModelSelector();
        initializeChat();
        initializeImageHandler();
        setupMobileNavigation();
    }, 2000);
});

function setupMobileNavigation() {
    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking on main content on mobile
        document.querySelector('.main-content').addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible, you could refresh data here if needed
    }
});

// Handle beforeunload for unsaved changes
window.addEventListener('beforeunload', (e) => {
    // You could add confirmation for unsaved changes here
});
