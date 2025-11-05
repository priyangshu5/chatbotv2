import { initializeModelSelector } from './models.js';
import { initializeChat } from './chat.js';
import { initializeImageHandler } from './image-handler.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeModelSelector();
    initializeChat();
    initializeImageHandler();
    
    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Close sidebar when clicking on main content on mobile
    document.querySelector('.main-content').addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    });
});
