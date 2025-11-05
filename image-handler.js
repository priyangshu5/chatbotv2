import { getCurrentModel } from './models.js';

const API_KEY = 'ddc-a4f-d050829fd1f3437fbb6ca2dce414467a';
const IMAGE_GENERATION_URL = 'https://api.a4f.co/v1/images/generations';
const CHAT_API_URL = 'https://api.a4f.co/v1/chat/completions';

// Available image generation models
const IMAGE_GENERATION_MODELS = {
    'Midjourney V7': 'provider-5/midjourney-v7',
    'Imagen 3': 'provider-4/imagen-3',
    'Imagen 4': 'provider-4/imagen-4',
    'Qwen Image': 'provider-4/qwen-image'
};

// DOM Elements
const uploadImageBtn = document.getElementById('upload-image');
const imageInput = document.getElementById('image-input');

let currentImageModel = 'provider-4/qwen-image'; // Default image model

export function initializeImageHandler() {
    if (uploadImageBtn && imageInput) {
        uploadImageBtn.addEventListener('click', () => {
            imageInput.click();
        });
        
        imageInput.addEventListener('change', handleImageUpload);
    }
}

// Set image generation model
export function setImageModel(modelId) {
    currentImageModel = modelId;
}

// Get current image model
export function getCurrentImageModel() {
    return currentImageModel;
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file (JPEG, PNG, GIF, etc.)');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showError('Image size must be less than 5MB');
        return;
    }
    
    // Hide welcome message
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
    
    // Read the image file
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const imageDataUrl = e.target.result;
        
        // Add image to chat
        await addImageToChat(imageDataUrl, file.name);
        
        // Try to analyze image with available models
        await analyzeImage(imageDataUrl);
    };
    
    reader.onerror = () => {
        showError('Error reading image file');
    };
    
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
}

function showError(message) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    messagesContainer.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

async function addImageToChat(imageDataUrl, fileName) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '👤';
    
    const senderInfo = document.createElement('div');
    senderInfo.className = 'sender-info';
    
    const senderName = document.createElement('div');
    senderName.className = 'sender-name';
    senderName.textContent = 'You';
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    senderInfo.appendChild(senderName);
    senderInfo.appendChild(messageTime);
    messageHeader.appendChild(avatar);
    messageHeader.appendChild(senderInfo);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const imageInfo = document.createElement('div');
    imageInfo.style.marginBottom = '0.5rem';
    imageInfo.textContent = `📎 ${fileName}`;
    
    const image = document.createElement('img');
    image.src = imageDataUrl;
    image.className = 'message-image';
    image.alt = 'Uploaded image';
    image.loading = 'lazy';
    image.style.maxWidth = '300px';
    image.style.borderRadius = '8px';
    
    contentDiv.appendChild(imageInfo);
    contentDiv.appendChild(image);
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function analyzeImage(imageDataUrl) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    // Show typing indicator
    const typingId = 'image-typing-indicator';
    showImageTypingIndicator(typingId);
    
    try {
        console.log('🔄 Attempting image analysis...');
        
        // Try using text models that might support image analysis
        const textModel = getCurrentModel();
        
        // Convert image to base64 without data URL prefix
        const base64Image = imageDataUrl.split(',')[1];
        
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: textModel.id,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Please analyze this image and describe what you see in detail. Include objects, colors, context, and any text if present."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                stream: false
            })
        });
        
        console.log('📥 Image analysis response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Image analysis error:', errorText);
            
            // If model doesn't support images, try a different approach
            if (response.status === 400 || response.status === 404) {
                throw new Error('Image analysis is not supported with the current model. Please try uploading the image again or use a different model.');
            }
            throw new Error(`Image analysis failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Image analysis success:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response from image analysis');
        }
        
        const analysis = data.choices[0].message.content;
        
        // Remove typing indicator
        removeImageTypingIndicator(typingId);
        
        // Add analysis to chat
        addMessageToChat('assistant', analysis, false);
        
    } catch (error) {
        console.error('Error analyzing image:', error);
        removeImageTypingIndicator(typingId);
        
        let errorMessage = `I apologize, but I encountered an error while analyzing the image: ${error.message}. `;
        
        if (error.message.includes('not supported')) {
            errorMessage += '\n\n**Tip:** Try using a different AI model or describe the image in text for assistance.';
        } else {
            errorMessage += 'Please try again with a different image.';
        }
        
        addMessageToChat('assistant', errorMessage, false);
    }
}

function showImageTypingIndicator(id) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = id;
    
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
        <span>Analyzing image...</span>
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
}

function removeImageTypingIndicator(id) {
    const typingElement = document.getElementById(id);
    if (typingElement) {
        typingElement.remove();
    }
}

// Image generation function
export async function generateImage(prompt, model = null) {
    const imageModel = model || currentImageModel;
    
    console.log('🎨 Generating image with prompt:', prompt, 'Model:', imageModel);
    
    try {
        const requestBody = {
            model: imageModel,
            prompt: prompt,
            n: 1,
            size: "1024x1024"
        };

        const response = await fetch(IMAGE_GENERATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Image generation response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            
            // Handle specific model access denied error
            if (response.status === 403 && errorData.error?.code === 'model_access_denied') {
                throw new Error(`Image model '${imageModel}' is not available for your plan. Try a different image model.`);
            }
            
            throw new Error(`Image generation failed: ${response.status} - ${JSON.stringify(errorData, null, 2)}`);
        }
        
        const data = await response.json();
        console.log('✅ Image generation success:', data);
        
        if (data.data && data.data[0] && data.data[0].url) {
            return {
                url: data.data[0].url,
                model: imageModel
            };
        } else {
            throw new Error('Invalid response from image generation API - no image URL found');
        }
        
    } catch (error) {
        console.error('❌ Image generation failed:', error);
        throw error;
    }
}

// Add message to chat (helper function)
function addMessageToChat(role, content, usedWebSearch = false) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
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

// Display generated image in chat
export async function displayGeneratedImage(imageUrl, prompt, model) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
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
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    senderInfo.appendChild(senderName);
    senderInfo.appendChild(messageTime);
    messageHeader.appendChild(avatar);
    messageHeader.appendChild(senderInfo);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const imageInfo = document.createElement('div');
    imageInfo.style.marginBottom = '0.5rem';
    imageInfo.innerHTML = `🎨 <strong>Generated Image</strong><br>`;
    imageInfo.innerHTML += `<em>Prompt:</em> "${prompt}"<br>`;
    imageInfo.innerHTML += `<em>Model:</em> ${Object.keys(IMAGE_GENERATION_MODELS).find(key => IMAGE_GENERATION_MODELS[key] === model) || model}`;
    
    const image = document.createElement('img');
    image.src = imageUrl;
    image.className = 'message-image generated-image';
    image.alt = `Generated image: ${prompt}`;
    image.loading = 'lazy';
    image.style.maxWidth = '400px';
    image.style.borderRadius = '8px';
    image.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    
    contentDiv.appendChild(imageInfo);
    contentDiv.appendChild(image);
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Get available image models
export function getAvailableImageModels() {
    return IMAGE_GENERATION_MODELS;
}

// Test image generation
window.testImageGeneration = async function(prompt = "a beautiful sunset over mountains") {
    console.log('🧪 Testing image generation...');
    try {
        const result = await generateImage(prompt);
        console.log('✅ Image generated:', result.url);
        
        // Display the test image
        await displayGeneratedImage(result.url, prompt, result.model);
        
        return result;
    } catch (error) {
        console.error('❌ Image generation test failed:', error);
        alert(`Image generation failed: ${error.message}`);
        throw error;
    }
};

// Test all image models
window.testAllImageModels = async function(prompt = "a cute cat") {
    console.log('🧪 Testing all image models...');
    const results = [];
    
    for (const [modelName, modelId] of Object.entries(IMAGE_GENERATION_MODELS)) {
        try {
            console.log(`Testing ${modelName}...`);
            const result = await generateImage(prompt, modelId);
            results.push({
                model: modelName,
                success: true,
                url: result.url
            });
            
            // Display the image
            await displayGeneratedImage(result.url, `${prompt} (${modelName})`, modelId);
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ ${modelName} failed:`, error.message);
            results.push({
                model: modelName,
                success: false,
                error: error.message
            });
        }
    }
    
    console.log('Image model test results:', results);
    return results;
};
