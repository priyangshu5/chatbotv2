import { auth, database } from './firebase-config.js';
import { ref, set, get, push, onValue, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getCurrentModel } from './models.js';
import { searchDuckDuckGo, needsWebSearch } from './web-search.js';

const API_KEY = 'ddc-a4f-d050829fd1f3437fbb6ca2dce414467a';
const TEXT_API_URL = 'https://api.a4f.co/v1/chat/completions';

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
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    });
    
    newChatBtn.addEventListener('click', createNewChat);
    webSearchToggle.addEventListener('click', toggleWebSearch);
}

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
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Send message to AI
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isGenerating) return;

    welcomeMessage.style.display = 'none';
    
    if (!currentChatId) {
        await createNewChatInDB();
    }
    
    addMessageToUI('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    const typingId = showTypingIndicator();
    
    isGenerating = true;
    sendButton.disabled = true;
    
    try {
        let finalMessage = message;
        let webSearchResults = '';
        let usedWebSearch = false;
        
        if (webSearchEnabled && needsWebSearch(message)) {
            usedWebSearch = true;
            webSearchResults = await performWebSearch(message);
            if (webSearchResults && webSearchResults !== "No specific information found from web search.") {
                finalMessage = `User Question: ${message}\n\nWeb Search Results: ${webSearchResults}\n\nPlease provide a comprehensive answer based on the web search results and your knowledge.`;
            }
        }
        
        const model = getCurrentModel();
        const response = await callA4FAPI(finalMessage, model);
        
        removeTypingIndicator(typingId);
        await addMessageToDB('assistant', response);
        addMessageToUI('assistant', response, usedWebSearch);
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator(typingId);
        
        // Show the actual error message for debugging
        addMessageToUI('assistant', `I apologize, but I encountered an error: ${error.message}. Please check the console for details.`);
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

// Fixed API call for A4F
async function callA4FAPI(message, model) {
    console.log('🔄 Calling A4F API...', {
        model: model.id,
        message: message.substring(0, 100) + '...',
        endpoint: TEXT_API_URL
    });

    const requestBody = {
        model: model.id,
        messages: [
            {
                role: "user",
                content: message
            }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch(TEXT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json',
                'User-Agent': 'Priyangshu-Chatbot/1.0'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorText = await response.text();
                errorDetails = errorText;
                console.error('❌ API Error Response:', errorText);
                
                // Try to parse as JSON for structured error
                try {
                    const errorJson = JSON.parse(errorText);
                    errorDetails = JSON.stringify(errorJson, null, 2);
                } catch (e) {
                    // Keep as text if not JSON
                }
            } catch (e) {
                errorDetails = 'Could not read error response';
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}\nDetails: ${errorDetails}`);
        }

        const data = await response.json();
        console.log('✅ API Response:', data);

        // Handle different response structures
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content;
        } else if (data.choices && data.choices[0] && data.choices[0].text) {
            return data.choices[0].text;
        } else if (data.content) {
            return data.content;
        } else if (data.result) {
            return data.result;
        } else {
            console.warn('Unexpected response structure:', data);
            throw new Error('Unexpected response format from API');
        }

    } catch (error) {
        console.error('❌ API Call Failed:', error);
        throw error;
    }
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
    
    let formattedContent = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    
    contentDiv.innerHTML = formattedContent;
    
    if (usedWebSearch && role === 'assistant') {
        const searchIndicator = document.createElement('div');
        searchIndicator.className = 'search-indicator';
        searchIndicator.innerHTML = '🔍 Answer includes real-time web search results';
        contentDiv.appendChild(searchIndicator);
    }
    
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
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
    
    messagesContainer.innerHTML = '';
    
    if (chatData.messages) {
        chatData.messages.forEach(message => {
            addMessageToUI(message.role, message.content);
        });
    }
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.chat-item').forEach(item => {
        if (item.textContent === chatData.title) {
            item.classList.add('active');
        }
    });
    
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('open');
    }
}

// Manual API test function
window.testA4FAPI = async function() {
    console.log('🧪 Testing A4F API connection...');
    
    const testPayload = {
        model: 'provider-3/gpt-4o-mini',
        messages: [
            {
                role: "user",
                content: "Hello! Please respond with 'API is working correctly' if you receive this message."
            }
        ],
        max_tokens: 100,
        temperature: 0.7,
        stream: false
    };

    try {
        console.log('📤 Sending test request:', testPayload);
        
        const response = await fetch(TEXT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });

        console.log('📥 Test response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Test failed with error:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Test successful! Response:', data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            alert(`✅ API Test Successful!\nResponse: ${data.choices[0].message.content}`);
            return data.choices[0].message.content;
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (error) {
        console.error('❌ API Test Failed:', error);
        alert(`❌ API Test Failed:\n${error.message}`);
        throw error;
    }
};

// Export function to check web search status
export function isWebSearchEnabled() {
    return webSearchEnabled;
}

// Test API on load
setTimeout(() => {
    console.log('🔧 A4F API configured with:', {
        endpoint: TEXT_API_URL,
        key: API_KEY ? '✅ Present' : '❌ Missing'
    });
}, 1000);
