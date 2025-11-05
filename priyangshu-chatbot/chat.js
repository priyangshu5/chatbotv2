import { auth, database } from './firebase-config.js';
import { ref, set, get, push, onValue, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getCurrentModel } from './models.js';
import { searchDuckDuckGo, needsWebSearch } from './web-search.js';

const API_KEY = 'ddc-a4f-d050829fd1f3437fbb6ca2dce414467a';
const API_URL = 'https://www.a4f.co/api/v1/completions';

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const newChatBtn = document.getElementById('new-chat');
const chatHistory = document.querySelector('.chat-history');
const currentChatTitle = document.getElementById('current-chat-title');
const webSearchToggle = document.getElementById('web-search-toggle');

let currentChatId = null;
let isGenerating = false;
let webSearchEnabled = true;

// Initialize chat
export function initializeChat() {
    loadChatHistory();
    setupEventListeners();
    updateWebSearchButton();
}

function setupEventListeners() {
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    });
    
    // New chat button
    newChatBtn.addEventListener('click', createNewChat);
    
    // Web search toggle
    webSearchToggle.addEventListener('click', toggleWebSearch);
}

// Toggle web search
function toggleWebSearch() {
    webSearchEnabled = !webSearchEnabled;
    updateWebSearchButton();
}

function updateWebSearchButton() {
    if (webSearchEnabled) {
        webSearchToggle.textContent = '🌐 Web Search: ON';
        webSearchToggle.classList.remove('off');
    } else {
        webSearchToggle.textContent = '🌐 Web Search: OFF';
        webSearchToggle.classList.add('off');
    }
}

// Create new chat
function createNewChat() {
    currentChatId = null;
    currentChatTitle.textContent = 'New Chat';
    messagesContainer.innerHTML = '';
    messageInput.value = '';
    messageInput.focus();
    
    // Remove active class from all chat items
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Send message to AI
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isGenerating) return;
    
    // Create new chat if none exists
    if (!currentChatId) {
        await createNewChatInDB();
    }
    
    // Add user message to UI
    addMessageToUI('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    isGenerating = true;
    sendButton.disabled = true;
    
    try {
        let finalMessage = message;
        let webSearchResults = '';
        let usedWebSearch = false;
        
        // Check if we need web search and if it's enabled
        if (webSearchEnabled && needsWebSearch(message)) {
            usedWebSearch = true;
            webSearchResults = await performWebSearch(message);
            if (webSearchResults && webSearchResults !== "No specific information found from web search.") {
                finalMessage = `User Question: ${message}\n\nWeb Search Results: ${webSearchResults}\n\nPlease provide a comprehensive answer based on the web search results and your knowledge.`;
            }
        }
        
        const model = getCurrentModel();
        const response = await callA4FAPI(finalMessage, model);
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add AI response to UI and database
        await addMessageToDB('assistant', response);
        addMessageToUI('assistant', response, usedWebSearch);
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator(typingId);
        addMessageToUI('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
        isGenerating = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Perform web search
async function performWebSearch(query) {
    try {
        const searchResults = await searchDuckDuckGo(query);
        return searchResults;
    } catch (error) {
        console.error('Web search failed:', error);
        return null;
    }
}

// Call A4F API
async function callA4FAPI(message, model) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: model.id,
            messages: [
                {
                    role: 'user',
                    content: message
                }
            ],
            stream: false
        })
    });
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Add message to UI
function addMessageToUI(role, content, usedWebSearch = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? 'U' : 'P';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Convert line breaks to <br> tags
    contentDiv.innerHTML = content.replace(/\n/g, '<br>');
    
    // Add web search indicator if used
    if (usedWebSearch && role === 'assistant') {
        const searchIndicator = document.createElement('div');
        searchIndicator.className = 'search-indicator';
        searchIndicator.textContent = '🔍 Answer includes real-time web search results';
        contentDiv.appendChild(searchIndicator);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'P';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<div class="typing-indicator">Priyangshu is typing...</div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(contentDiv);
    messagesContainer.appendChild(typingDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return 'typing-indicator';
}

// Remove typing indicator
function removeTypingIndicator(id) {
    const typingElement = document.getElementById(id);
    if (typingElement) {
        typingElement.remove();
    }
}

// Database functions
async function createNewChatInDB() {
    const user = auth.currentUser;
    if (!user) return;
    
    const chatRef = push(ref(database, `users/${user.uid}/chats`));
    currentChatId = chatRef.key;
    
    await set(chatRef, {
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        messages: []
    });
    
    currentChatTitle.textContent = 'New Chat';
    loadChatHistory();
}

async function addMessageToDB(role, content) {
    if (!currentChatId) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    const chatRef = ref(database, `users/${user.uid}/chats/${currentChatId}`);
    const snapshot = await get(chatRef);
    const chatData = snapshot.val();
    
    const messages = chatData.messages || [];
    messages.push({
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    });
    
    // Update chat title with first message if it's the first assistant message
    if (messages.length === 2 && role === 'assistant') {
        const title = messages[0].content.substring(0, 50) + (messages[0].content.length > 50 ? '...' : '');
        await update(chatRef, {
            title: title,
            messages: messages
        });
        currentChatTitle.textContent = title;
    } else {
        await update(chatRef, {
            messages: messages
        });
    }
    
    loadChatHistory();
}

function loadChatHistory() {
    const user = auth.currentUser;
    if (!user) return;
    
    const chatsRef = ref(database, `users/${user.uid}/chats`);
    
    onValue(chatsRef, (snapshot) => {
        const chats = snapshot.val();
        chatHistory.innerHTML = '';
        
        if (!chats) {
            chatHistory.innerHTML = '<div class="no-chats">No chats yet</div>';
            return;
        }
        
        const sortedChats = Object.entries(chats)
            .sort(([,a], [,b]) => new Date(b.createdAt) - new Date(a.createdAt));
        
        sortedChats.forEach(([chatId, chatData]) => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (chatId === currentChatId) {
                chatItem.classList.add('active');
            }
            
            chatItem.textContent = chatData.title || 'New Chat';
            chatItem.addEventListener('click', () => loadChat(chatId, chatData));
            
            chatHistory.appendChild(chatItem);
        });
    });
}

function loadChat(chatId, chatData) {
    currentChatId = chatId;
    currentChatTitle.textContent = chatData.title || 'Chat';
    
    // Clear current messages
    messagesContainer.innerHTML = '';
    
    // Load messages
    if (chatData.messages) {
        chatData.messages.forEach(message => {
            addMessageToUI(message.role, message.content);
        });
    }
    
    // Update active chat in sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.chat-item').forEach(item => {
        if (item.textContent === chatData.title) {
            item.classList.add('active');
        }
    });
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('open');
    }
}

// Export function to check web search status
export function isWebSearchEnabled() {
    return webSearchEnabled;
}
