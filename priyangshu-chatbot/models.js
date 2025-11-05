// Available models from your list
export const availableModels = [
    { id: 'provider-3/deepseek-v3', name: 'DeepSeek V3', type: 'text' },
    { id: 'provider-3/deepseek-v3-0324', name: 'DeepSeek V3 (0324)', type: 'text' },
    { id: 'provider-3/llama-3-70b', name: 'Llama 3 70B', type: 'text' },
    { id: 'provider-3/llama-3.1-70b', name: 'Llama 3.1 70B', type: 'text' },
    { id: 'provider-3/llama-3.2-3b', name: 'Llama 3.2 3B', type: 'text' },
    { id: 'provider-3/llama-3.3-70b', name: 'Llama 3.3 70B', type: 'text' },
    { id: 'provider-3/gpt-4o-mini', name: 'GPT-4o Mini', type: 'text' },
    { id: 'provider-3/qwen-2.5-72b', name: 'Qwen 2.5 72B', type: 'text' },
    { id: 'provider-3/mistral-small-latest', name: 'Mistral Small', type: 'text' },
    { id: 'provider-3/gemma-3-27b-it', name: 'Gemma 3 27B', type: 'text' },
    { id: 'provider-5/midjourney-v7', name: 'Midjourney V7', type: 'image' },
    { id: 'provider-4/imagen-3', name: 'Imagen 3', type: 'image' },
    { id: 'provider-4/imagen-4', name: 'Imagen 4', type: 'image' },
    { id: 'provider-4/qwen-image', name: 'Qwen Image', type: 'image' },
    { id: 'provider-1/internvl3-78b', name: 'InternVL3 78B', type: 'vision' },
    { id: 'provider-1/qwen2.5-vl-72b-instruct', name: 'Qwen2.5 VL 72B', type: 'vision' }
];

// Initialize model selector
export function initializeModelSelector() {
    const modelSelect = document.getElementById('model-select');
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Add model groups
    const textModels = availableModels.filter(model => model.type === 'text');
    const imageModels = availableModels.filter(model => model.type === 'image');
    const visionModels = availableModels.filter(model => model.type === 'vision');
    
    // Add text models
    if (textModels.length > 0) {
        const textGroup = document.createElement('optgroup');
        textGroup.label = 'Text Models';
        textModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            textGroup.appendChild(option);
        });
        modelSelect.appendChild(textGroup);
    }
    
    // Add image models
    if (imageModels.length > 0) {
        const imageGroup = document.createElement('optgroup');
        imageGroup.label = 'Image Generation';
        imageModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            imageGroup.appendChild(option);
        });
        modelSelect.appendChild(imageGroup);
    }
    
    // Add vision models
    if (visionModels.length > 0) {
        const visionGroup = document.createElement('optgroup');
        visionGroup.label = 'Vision Models';
        visionModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            visionGroup.appendChild(option);
        });
        modelSelect.appendChild(visionGroup);
    }
    
    // Set default model
    modelSelect.value = 'provider-3/deepseek-v3';
}

// Get current selected model
export function getCurrentModel() {
    const modelSelect = document.getElementById('model-select');
    const modelId = modelSelect.value;
    return availableModels.find(model => model.id === modelId);
}
