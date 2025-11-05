const DUCKDUCKGO_API = 'https://api.duckduckgo.com/';

export async function searchDuckDuckGo(query) {
    try {
        const response = await fetch(`${DUCKDUCKGO_API}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
        
        if (!response.ok) {
            throw new Error(`DuckDuckGo API error: ${response.status}`);
        }
        
        const data = await response.json();
        return processDuckDuckGoResults(data);
    } catch (error) {
        console.error('Error searching DuckDuckGo:', error);
        return null;
    }
}

function processDuckDuckGoResults(data) {
    let result = '';
    
    // Add abstract if available
    if (data.Abstract && data.AbstractText) {
        result += `**${data.Heading || 'Information'}**: ${data.AbstractText}\n\n`;
    }
    
    // Add definition if available
    if (data.Definition && data.DefinitionText) {
        result += `**Definition**: ${data.DefinitionText}\n\n`;
    }
    
    // Add related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        result += "**Related Information**:\n";
        data.RelatedTopics.slice(0, 3).forEach((topic, index) => {
            if (topic.Text) {
                result += `• ${topic.Text}\n`;
            }
        });
        result += "\n";
    }
    
    // Add main topic if available
    if (data.Results && data.Results.length > 0) {
        result += "**Additional Details**:\n";
        data.Results.slice(0, 2).forEach((resultItem, index) => {
            result += `• ${resultItem.Text}\n`;
        });
    }
    
    return result || "No specific information found from web search.";
}

// Function to check if a query needs web search
export function needsWebSearch(message) {
    const searchKeywords = [
        'current', 'recent', 'latest', 'today', 'yesterday', 'news',
        'weather', 'update', '2024', '2025', 'now', 'current events',
        'breaking', 'trending', 'live', 'score', 'results'
    ];
    
    const currentEvents = [
        'president', 'election', 'sports', 'game', 'match', 'COVID',
        'pandemic', 'stock', 'market', 'price', 'crypto', 'bitcoin'
    ];
    
    const questionWords = ['what is', 'who is', 'when is', 'where is', 'how to'];
    
    const lowerMessage = message.toLowerCase();
    
    // Check if it's a factual question that might need current info
    return searchKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           currentEvents.some(event => lowerMessage.includes(event)) ||
           questionWords.some(question => lowerMessage.includes(question)) ||
           /(\b\d{4}\b)|(current|recent|latest)/i.test(message);
}
