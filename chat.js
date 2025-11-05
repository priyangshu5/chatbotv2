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
const welcomeMessage = document.getElementById('welcome-message');

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
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
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
    const searchText = webSearchToggle.querySelector('.search-text');
    if (webSearchEnabled) {
        searchText.textContent = 'Web Search: ON';
        webSearchToggle.classList.remove('off');
    } else {
        searchText.textContent = 'Web Search: OFF';
        webSearchToggle.classList.add('off');
    }
}

// Create new chat
function createNewChat() {
    currentChatId = null;
    currentChatTitle.textContent = 'New Chat';
    messagesContainer.innerHTML = '';
    messageInput.value = '';
    messageInput.style.height = 'auto';
    welcomeMessage.style.display = 'block';
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

    // Hide welcome message
    welcomeMessage.style.display = 'none';
    
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
    sendButton.classList.add('loading');
    
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
        
        let errorMessage = 'Sorry, I encountered an error. ';
        if (error.message.includes('API error')) {
            errorMessage += 'The AI service is currently unavailable. Please try again in a moment.';
        } else if (error.message.includes('network')) {
            errorMessage += 'Network connection issue. Please check your internet connection.';
        } else {
            errorMessage += 'Please try again.';
        }
        
        addMessageToUI('assistant', errorMessage);
    } finally {
        isGenerating = false;
        sendButton.disabled = false;
        sendButton.classList.remove('loading');
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

// Call A4F API - FIXED VERSION
async function callA4FAPI(message, model) {
    const requestBody = {
        model: model.id,
        messages: [
            {
                role: 'user',
                content: message
            }
        ],
        stream: false,
        max_tokens: 2000,
        temperature: 0.7
    };

    console.log('API Request:', {
        url: API_URL,
        model: model.id,
        messageLength: message.length
    });

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response Error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
        });
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid API response structure:', data);
        throw new Error('Invalid response from AI service');
    }
    
    return data.choices[0].message.content;
}

// Add message to UI
function addMessageToUI(role, content, usedWebSearch = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const senderInfo = document.createElement('div');
    senderInfo.className = 'sender-info';
    
    const senderName = document.createElement('div');
    senderName.className = 'sender-name';
    senderName.textContent = role === 'user' ? 'You' : 'Priyangshu';
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    senderInfo.appendChild(senderName);
    senderInfo.appendChild(messageTime);
    messageHeader.appendChild(avatar);
    messageHeader.appendChild(senderInfo);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Convert line breaks to <br> tags and format markdown-like text
    let formattedContent = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    
    contentDiv.innerHTML = formattedContent;
    
    // Add web search indicator if used
    if (usedWebSearch && role === 'assistant') {
        const searchIndicator = document.createElement('div');
        searchIndicator.className = 'search-indicator';
        searchIndicator.innerHTML = '🔍 Answer includes real-time web search results';
        contentDiv.appendChild(searchIndicator);
    }
    
    messageDiv.appendChild(messageHeader);
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
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '🤖';
    
    const senderInfo = document.createElement('div');
    senderInfo.className = 'sender-info';
    
    const senderName = document.createElement('div');
    senderName.className = 'sender-name';
    senderName.textContent = 'Priyangshu';
    
    senderInfo.appendChild(senderName);
    messageHeader.appendChild(avatar);
    messageHeader.appendChild(senderInfo);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <span>Priyangshu is thinking</span>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    contentDiv.appendChild(typingIndicator);
    typingDiv.appendChild(messageHeader);
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
            messages: messages,
            updatedAt: new Date().toISOString()
        });
        currentChatTitle.textContent = title;
    } else {
        await update(chatRef, {
            messages: messages,
            updatedAt: new Date().toISOString()
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
            .sort(([,a], [,b]) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        
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
    welcomeMessage.style.display = 'none';
    
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
