import { auth, database } from './firebase-config.js';
import { ref, set, get, push, onValue, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getCurrentModel, isModelAvailable } from './models.js';
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
        
        // Always try web search if enabled, even if API might fail
        if (webSearchEnabled && needsWebSearch(message)) {
            usedWebSearch = true;
            try {
                webSearchResults = await performWebSearch(message);
                if (webSearchResults && webSearchResults !== "No specific information found from web search.") {
                    finalMessage = `User Question: ${message}\n\nWeb Search Results: ${webSearchResults}\n\nPlease provide a comprehensive answer based on the web search results and your knowledge.`;
                }
            } catch (searchError) {
                console.warn('Web search failed, continuing without search results:', searchError);
                // Continue without web search results
            }
        }
        
        const model = getCurrentModel();
        console.log('Using model:', model.id);
        
        // Check if model is available for free plan
        if (!isModelAvailable(model.id)) {
            throw new Error(`Model '${model.name}' is not available for your free plan. Please switch to a different model.`);
        }
        
        const response = await callA4FAPI(finalMessage, model);
        
        removeTypingIndicator(typingId);
        await addMessageToDB('assistant', response);
        addMessageToUI('assistant', response, usedWebSearch);
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator(typingId);
        
        let errorMessage = '';
        
        if (error.message.includes('not available for your free plan')) {
            errorMessage = `
🚫 **Model Access Denied**

${error.message}

**Available Models for Free Plan:**
• Qwen 2.5 72B ✅
• DeepSeek V3 ✅  
• Llama 3 70B ✅
• Mistral Small ✅

**How to fix:**
1. Click on the model selector (top of chat)
2. Choose one of the available models above
3. Try sending your message again

The web search feature is still available for real-time information!
            `.trim();
        } else if (webSearchEnabled) {
            errorMessage = `
I encountered a technical issue with the AI service, but I can still help you with web search results!

**Technical Details:**
- Error: ${error.message}
- Service: A4F API
- Model: ${getCurrentModel().name}

**What you can do:**
1. Try sending your message again
2. Check if web search is enabled (it should work for real-time information)
3. Try a simpler question
4. Check your internet connection

The web search feature should still work to provide you with current information from the internet.
            `.trim();
        } else {
            errorMessage = `
I apologize, but I'm currently unable to connect to the AI service. 

**Error Details:** ${error.message}

**Troubleshooting Steps:**
1. Check your internet connection
2. Try refreshing the page
3. The service might be temporarily down
4. You can enable web search for real-time information

Please try again in a few moments. If the issue persists, you may want to contact the service provider.
            `.trim();
        }
        
        await addMessageToDB('assistant', errorMessage);
        addMessageToUI('assistant', errorMessage);
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
        return "Unable to fetch web search results at this time. Please try again later.";
    }
}

// Enhanced API call with better error handling
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

    console.log('API Request:', {
        url: API_URL,
        model: model.id,
        messageLength: message.length
    });

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                errorData = { error: responseText || `HTTP ${response.status}` };
            }
            
            // Handle specific model access denied error
            if (response.status === 403 && errorData.detail?.error?.code === 'model_access_denied') {
                throw new Error(`Model '${model.id}' is not available for your free plan. Please switch to a different model.`);
            }
            
            throw new Error(`API Error (${response.status}): ${JSON.stringify(errorData, null, 2)}`);
        }

        const data = JSON.parse(responseText);
        
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content;
        } else if (data.choices && data.choices[0] && data.choices[0].text) {
            return data.choices[0].text;
        } else {
            console.warn('Unexpected API response format:', data);
            throw new Error(`Unexpected API response format: ${JSON.stringify(data, null, 2)}`);
        }

    } catch (error) {
        console.error('API Call Failed:', error);
        
        if (error.name === 'AbortError') {
            throw new Error('Request timeout: The AI service took too long to respond. Please try again.');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Cannot connect to the AI service. Please check your internet connection and try again.');
        } else if (error.message.includes('API Key')) {
            throw new Error('Authentication error: Please check your API key configuration.');
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

// Auto-test API connection
async function testAPIConnection() {
    const testMessage = "Hello! This is a connection test. Please respond with 'Connection successful!' if you can see this message.";
    const model = getCurrentModel();
    
    try {
        console.log('Testing API connection with model:', model.id);
        
        // Check if model is available first
        if (!isModelAvailable(model.id)) {
            throw new Error(`Model '${model.name}' is not available for your free plan.`);
        }
        
        const response = await callA4FAPI(testMessage, model);
        
        console.log('✅ API connection test successful');
        
        if (messagesContainer.children.length === 0) {
            const successMessage = `
🎉 **API Connection Successful!**

I've successfully connected to the AI service using **${model.name}**. Here's what works:

✅ **Text Chat** - Full conversations with AI
✅ **Web Search** - Real-time information (when enabled)
✅ **Multiple Models** - Various AI models available
✅ **Chat History** - Your conversations are saved

You can now start chatting with me! Try asking a question or enabling web search for current information.
            `.trim();
            
            addMessageToUI('assistant', successMessage);
            welcomeMessage.style.display = 'none';
        }
        
        return { success: true, response: response };
    } catch (error) {
        console.error('API connection test failed:', error);
        
        let errorMessage = '';
        
        if (error.message.includes('not available for your free plan')) {
            errorMessage = `
🔧 **Connection Test Failed**

The current model (${model.name}) is not available for your free plan.

**Available Models for Free Plan:**
• Qwen 2.5 72B ✅
• DeepSeek V3 ✅  
• Llama 3 70B ✅
• Mistral Small ✅

**How to fix:**
1. Click on the model selector at the top
2. Choose one of the available models above
3. The chat will work automatically!
            `.trim();
        } else {
            errorMessage = `
🔧 **Connection Test Failed**

I tried to connect to the AI service but encountered an issue:

**Error:** ${error.message}
**Model:** ${model.name}

**What still works:**
- Web search (when enabled) for real-time information
- Chat history and user interface

**Next steps:**
1. Try switching to a different model
2. Enable web search for real-time information
3. Check your internet connection

You can still try sending messages - sometimes the connection recovers automatically.
            `.trim();
        }
        
        if (messagesContainer.children.length === 0) {
            addMessageToUI('assistant', errorMessage);
            welcomeMessage.style.display = 'none';
        }
        
        return { success: false, error: error.message };
    }
}

// Export function to check web search status
export function isWebSearchEnabled() {
    return webSearchEnabled;
}

// Make functions available globally for debugging
window.testConnection = testAPIConnection;
window.getCurrentSettings = () => ({
    apiKey: API_KEY ? '***' + API_KEY.slice(-4) : 'Not set',
    apiUrl: API_URL,
    currentModel: getCurrentModel(),
    webSearchEnabled: webSearchEnabled,
    isModelAvailable: isModelAvailable(getCurrentModel().id)
});
