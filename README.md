# Priyangshu AI Chatbot

A ChatGPT-like AI chatbot website with multiple AI models, image generation, and analysis capabilities.

## Features

- 🤖 Multiple AI models (text, image generation, vision)
- 💬 Real-time chat with memory
- 🖼️ Image upload and analysis
- 🎨 Image generation
- 🔐 User authentication
- 💾 Chat history storage
- 📱 Responsive design

## Setup Instructions

1. **Create GitHub Repository**
   - Create a new repository on GitHub
   - Upload all the files from this structure
   - Enable GitHub Pages in repository settings

2. **Firebase Configuration**
   - The Firebase configuration is already set up in `firebase-config.js`
   - Make sure your Firebase project has Authentication and Realtime Database enabled

3. **API Configuration**
   - The A4F API key is already configured
   - Available models are listed in `models.js`

## File Structure

- `index.html` - Main HTML file
- `style.css` - All styles and responsive design
- `script.js` - Main application initialization
- `firebase-config.js` - Firebase configuration
- `auth.js` - Authentication handling
- `chat.js` - Chat functionality
- `models.js` - Model management
- `image-handler.js` - Image upload and analysis
- `assets/` - Icons and images

## Models Available

- **Text Models**: DeepSeek, Llama, GPT, Qwen, Mistral, Gemma
- **Image Generation**: Midjourney, Imagen, Qwen Image
- **Vision Models**: InternVL3, Qwen2.5 VL

## Deployment

1. Upload all files to your GitHub repository
2. Go to Repository Settings → Pages
3. Select "Deploy from branch" and choose main/master branch
4. Your site will be available at `https://username.github.io/repository-name`

## Note

Make sure to:
- Keep your API keys secure
- Test all features after deployment
- Check Firebase rules for database security
