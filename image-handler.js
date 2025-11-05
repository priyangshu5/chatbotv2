import { getCurrentModel } from './models.js';

const API_KEY = 'ddc-a4f-d050829fd1f3437fbb6ca2dce414467a';
const IMAGE_API_URL = 'https://api.a4f.co/v1/images/generations'; // Primary image endpoint

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
        alert('Please select an image file (JPEG, PNG, GIF, etc.)');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
    }
    
    // Hide welcome message
    document.getElementById('welcome-message').style.display = 'none';
    
    // Read the image file
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const imageDataUrl = e.target.result;
        
        // Add image to chat
        await addImageToChat(imageDataUrl, file.name);
        
        // Analyze image with AI
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
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

async function addImageToChat(imageDataUrl, fileName) {
    const messagesContainer = document.getElementById('messages-container');
    
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
    
    contentDiv.appendChild(imageInfo);
    contentDiv.appendChild(image);
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function analyzeImage(imageDataUrl) {
    // Show typing indicator
    const messagesContainer = document.getElementById('messages-container');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'image-typing-indicator';
    
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
        <span>Analyzing image</span>
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
    
    try {
        // Use a vision model for image analysis
        const visionModel = 'provider-1/internvl3-78b';
        
        console.log('🔄 Calling vision API for image analysis...');
        
        const response = await fetch('https://api.a4f.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: visionModel,
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
                                    url: imageDataUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                stream: false
            })
        });
        
        console.log('📥 Vision API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Vision API error:', errorText);
            throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Vision API success:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response from vision model');
        }
        
        const analysis = data.choices[0].message.content;
        
        // Remove typing indicator
        document.getElementById('image-typing-indicator').remove();
        
        // Add analysis to chat
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'message assistant';
        
        const analysisHeader = document.createElement('div');
        analysisHeader.className = 'message-header';
        
        const analysisAvatar = document.createElement('div');
        analysisAvatar.className = 'avatar';
        analysisAvatar.textContent = '🤖';
        
        const analysisSenderInfo = document.createElement('div');
        analysisSenderInfo.className = 'sender-info';
        
        const analysisSenderName = document.createElement('div');
        analysisSenderName.className = 'sender-name';
        analysisSenderName.textContent = 'Priyangshu';
        
        const analysisTime = document.createElement('div');
        analysisTime.className = 'message-time';
        analysisTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        analysisSenderInfo.appendChild(analysisSenderName);
        analysisSenderInfo.appendChild(analysisTime);
        analysisHeader.appendChild(analysisAvatar);
        analysisHeader.appendChild(analysisSenderInfo);
        
        const analysisContent = document.createElement('div');
        analysisContent.className = 'message-content';
        
        let formattedAnalysis = analysis
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        analysisContent.innerHTML = formattedAnalysis;
        
        analysisDiv.appendChild(analysisHeader);
        analysisDiv.appendChild(analysisContent);
        messagesContainer.appendChild(analysisDiv);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error analyzing image:', error);
        document.getElementById('image-typing-indicator').remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message assistant';
        
        const errorHeader = document.createElement('div');
        errorHeader.className = 'message-header';
        
        const errorAvatar = document.createElement('div');
        errorAvatar.className = 'avatar';
        errorAvatar.textContent = '🤖';
        
        const errorSenderInfo = document.createElement('div');
        errorSenderInfo.className = 'sender-info';
        
        const errorSenderName = document.createElement('div');
        errorSenderName.className = 'sender-name';
        errorSenderName.textContent = 'Priyangshu';
        
        errorSenderInfo.appendChild(errorSenderName);
        errorHeader.appendChild(errorAvatar);
        errorHeader.appendChild(errorSenderInfo);
        
        const errorContent = document.createElement('div');
        errorContent.className = 'message-content';
        errorContent.textContent = `I apologize, but I encountered an error while analyzing the image: ${error.message}. Please try again with a different image.`;
        
        errorDiv.appendChild(errorHeader);
        errorDiv.appendChild(errorContent);
        messagesContainer.appendChild(errorDiv);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Image generation function
async function generateImage(prompt) {
    console.log('🎨 Generating image with prompt:', prompt);
    
    try {
        const response = await fetch(IMAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                response_format: "url"
            })
        });
        
        console.log('📥 Image generation response:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Image generation failed: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Image generation success:', data);
        
        if (data.data && data.data[0] && data.data[0].url) {
            return data.data[0].url;
        } else {
            throw new Error('Invalid response from image generation API');
        }
        
    } catch (error) {
        console.error('❌ Image generation failed:', error);
        throw error;
    }
}

// Export for testing
window.testImageGeneration = async function(prompt = "a beautiful sunset over mountains") {
    console.log('🧪 Testing image generation...');
    try {
        const imageUrl = await generateImage(prompt);
        console.log('✅ Image generated:', imageUrl);
        alert(`Image generated successfully!\nURL: ${imageUrl}`);
        return imageUrl;
    } catch (error) {
        console.error('❌ Image generation test failed:', error);
        alert(`Image generation failed: ${error.message}`);
        throw error;
    }
};
