// Only include models that are likely to work
export const availableModels = [
    { id: 'provider-3/gpt-4o-mini', name: 'GPT-4o Mini', type: 'text' },
    { id: 'provider-3/deepseek-v3', name: 'DeepSeek V3', type: 'text' },
    { id: 'provider-3/llama-3-70b', name: 'Llama 3 70B', type: 'text' },
    { id: 'provider-3/qwen-2.5-72b', name: 'Qwen 2.5 72B', type: 'text' },
    { id: 'provider-3/mistral-small-latest', name: 'Mistral Small', type: 'text' },
    { id: 'provider-1/internvl3-78b', name: 'InternVL3 78B', type: 'vision' }
];

// Initialize model selector
export function initializeModelSelector() {
    const modelSelect = document.getElementById('model-select');
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Add text models
    const textModels = availableModels.filter(model => model.type === 'text');
    const visionModels = availableModels.filter(model => model.type === 'vision');
    
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
    
    // Set default to a reliable model
    modelSelect.value = 'provider-3/gpt-4o-mini';
}

// Get current selected model
export function getCurrentModel() {
    const modelSelect = document.getElementById('model-select');
    const modelId = modelSelect.value;
    return availableModels.find(model => model.id === modelId) || availableModels[0];
}
