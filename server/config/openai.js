const OpenAI = require('openai');

let client;

const getOpenAIClient = () => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        return null;
    }

    if (!client) {
        client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        });
    }

    return client;
};

module.exports = getOpenAIClient;
