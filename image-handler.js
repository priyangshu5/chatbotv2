import { getCurrentModel } from './models.js';

const API_KEY = 'ddc-a4f-d050829fd1f3437fbb6ca2dce414467a';
const API_URL = 'https://www.a4f.co/api/v1/completions';

// DOM Elements
const uploadImageBtn = document.getElementById('upload-image');
const imageInput = document.getElementById('image-input');

export function initializeImageHandler() {
    uploadImageBtn.addEventListener('click', () => {
        imageInput.click();
    });
    
    imageInput.addEventListener('change', handleImageUpload);
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    // Read the image file
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const imageDataUrl = e.target.result;
        
        // Add image to chat
        await addImageToChat(imageDataUrl);
        
        // Analyze image with AI
        await analyzeImage(imageDataUrl);
    };
    
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
}

async function addImageToChat(imageDataUrl) {
    const messagesContainer = document.getElementById('messages-container');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'U';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const image = document.createElement('img');
    image.src = imageDataUrl;
    image.className = 'message-image';
    image.alt = 'Uploaded image';
    
    contentDiv.appendChild(image);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function analyzeImage(imageDataUrl) {
    const model = getCurrentModel();
    
    // Show typing indicator
    const messagesContainer = document.getElementById('messages-container');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'image-typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'P';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<div class="typing-indicator">Analyzing image...</div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(contentDiv);
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        // For image analysis, we need to use a vision model
        // This is a simplified version - you might need to adjust based on the actual API requirements
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'provider-1/internvl3-78b', // Use a vision model
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Please analyze this image and describe what you see.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageDataUrl
                                }
                            }
                        ]
                    }
                ],
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const analysis = data.choices[0].message.content;
        
        // Remove typing indicator
        document.getElementById('image-typing-indicator').remove();
        
        // Add analysis to chat
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'message assistant';
        
        const analysisAvatar = document.createElement('div');
        analysisAvatar.className = 'avatar';
        analysisAvatar.textContent = 'P';
        
        const analysisContent = document.createElement('div');
        analysisContent.className = 'message-content';
        analysisContent.innerHTML = analysis.replace(/\n/g, '<br>');
        
        analysisDiv.appendChild(analysisAvatar);
        analysisDiv.appendChild(analysisContent);
        messagesContainer.appendChild(analysisDiv);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error analyzing image:', error);
        document.getElementById('image-typing-indicator').remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message assistant';
        
        const errorAvatar = document.createElement('div');
        errorAvatar.className = 'avatar';
        errorAvatar.textContent = 'P';
        
        const errorContent = document.createElement('div');
        errorContent.className = 'message-content';
        errorContent.textContent = 'Sorry, I encountered an error while analyzing the image.';
        
        errorDiv.appendChild(errorAvatar);
        errorDiv.appendChild(errorContent);
        messagesContainer.appendChild(errorDiv);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}
