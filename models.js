// Models that work with free plan
export const availableModels = [
    { id: 'provider-3/qwen-2.5-72b', name: 'Qwen 2.5 72B', type: 'text' },
    { id: 'provider-3/deepseek-v3', name: 'DeepSeek V3', type: 'text' },
    { id: 'provider-3/llama-3-70b', name: 'Llama 3 70B', type: 'text' },
    { id: 'provider-3/mistral-small-latest', name: 'Mistral Small', type: 'text' }
];

// Initialize model selector
export function initializeModelSelector() {
    const modelSelect = document.getElementById('model-select');
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Add all available models (they should all work with free plan)
    availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
    });
    
    // Set default to Qwen 2.5 72B (confirmed working)
    modelSelect.value = 'provider-3/qwen-2.5-72b';
}

// Get current selected model
export function getCurrentModel() {
    const modelSelect = document.getElementById('model-select');
    const modelId = modelSelect.value;
    return availableModels.find(model => model.id === modelId) || availableModels[0];
}

// Check if model is available for free plan
export function isModelAvailable(modelId) {
    const availableFreeModels = [
        'provider-3/qwen-2.5-72b',
        'provider-3/deepseek-v3', 
        'provider-3/llama-3-70b',
        'provider-3/mistral-small-latest'
    ];
    return availableFreeModels.includes(modelId);
}
