import { auth, database } from './firebase-config.js';
import { ref, set, get, push, onValue, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getCurrentModel } from './models.js';
import { searchDuckDuckGo, needsWebSearch } from './web-search.js';

const API_KEY = 'ddc-a4f-d050829fd1f3437fbb6ca2dce414467a';
const API_URL = 'https://api.a4f.co/v1/chat/completions';

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
    
    // Auto-test API on startup
    setTimeout(testAPIConnection, 2000);
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
        
        // Show detailed error to user
        const errorDetails = `
I encountered an issue while connecting to the AI service. Here's what happened:

**Error Details:** ${error.message}

**Possible Solutions:**
1. Check your internet connection
2. The AI service might be temporarily down
3. Your API key might need verification

**What I tried:**
- API Endpoint: ${API_URL}
- Model: ${getCurrentModel().name}
- Request completed but received an error response

Please try again in a few moments. If the issue persists, you can still use the web search feature for real-time information.
        `.trim();
        
        addMessageToUI('assistant', errorDetails);
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

// Fixed API call with better error handling
async function callA4FAPI(message, model) {
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

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // Get the response text first to handle both success and error cases
        const responseText = await response.text();
        
        if (!response.ok) {
            // Try to parse error as JSON, fallback to text
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                errorData = { error: responseText };
            }
            
            throw new Error(`API Error (${response.status}): ${JSON.stringify(errorData, null, 2)}`);
        }

        // Parse successful response
        const data = JSON.parse(responseText);
        
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content;
        } else if (data.choices && data.choices[0] && data.choices[0].text) {
            return data.choices[0].text;
        } else {
            throw new Error(`Unexpected API response format: ${JSON.stringify(data, null, 2)}`);
        }

    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Cannot connect to the AI service. Please check your internet connection.');
        }
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

// Auto-test API connection and show results in chat
async function testAPIConnection() {
    const testMessage = "Hello! This is a connection test. Please respond with 'Connection successful!' if you can see this message.";
    const model = getCurrentModel();
    
    try {
        console.log('Testing API connection...');
        const response = await callA4FAPI(testMessage, model);
        
        // If we get here, API is working
        console.log('✅ API connection test successful');
        
        // Show success message in chat if no messages exist
        if (messagesContainer.children.length === 0) {
            const successMessage = `
🎉 **API Connection Successful!**

I've successfully connected to the AI service. Here's what works:

✅ **Text Chat** - Full conversations with AI
✅ **Web Search** - Real-time information (when enabled)
✅ **Multiple Models** - Various AI models available
✅ **Image Analysis** - Upload and analyze images

You can now start chatting with me! Try asking a question or enabling web search for current information.
            `.trim();
            
            addMessageToUI('assistant', successMessage);
            welcomeMessage.style.display = 'none';
        }
        
        return { success: true, response: response };
    } catch (error) {
        console.error('API connection test failed:', error);
        
        // Show detailed error in chat
        const errorMessage = `
🔧 **Connection Test Failed**

I tried to connect to the AI service but encountered an issue:

**Error:** ${error.message}

**What this means:**
- The AI service might be temporarily unavailable
- There could be a network connectivity issue
- Your API key might need verification

**What still works:**
- Web search (when enabled) for real-time information
- Chat history and user interface
- Basic conversation (with limited responses)

**Next steps:**
1. Check your internet connection
2. Try sending a message anyway - sometimes it works on retry
3. Enable web search for real-time information
4. Contact support if the issue persists

You can still try sending messages - sometimes the connection recovers automatically.
        `.trim();
        
        // Only show error if no messages exist yet
        if (messagesContainer.children.length === 0) {
            addMessageToUI('assistant', errorMessage);
            welcomeMessage.style.display = 'none';
        }
        
        return { success: false, error: error.message };
    }
}

// Make test function available globally for easy access
window.testConnection = testAPIConnection;

// Export function to check web search status
export function isWebSearchEnabled() {
    return webSearchEnabled;
  }
