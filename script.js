// Initialize the application
import { initializeAuth } from './auth.js';
import { initializeChat } from './chat.js';
import { initializeModelSelector } from './models.js';
import { initializeImageHandler } from './image-handler.js';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initializeAuth();
    
    // Setup sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
    
    // Close sidebar when clicking on a chat item on mobile
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    });
});

// Export initialization functions for other modules
window.initializeApp = function() {
    initializeModelSelector();
    initializeChat();
    initializeImageHandler();
};
