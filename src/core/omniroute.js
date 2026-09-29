const axios = require('axios');

const OMNIROUTE_URL = 'https://omniroute-production-7900.up.railway.app';
const OMNIROUTE_API_KEY = 'sk-6e958441448cf5b4-b2fd96-fcc53dd0';;

// List of fallback combos in priority order
const FALLBACK_MODELS = ['brain', 'DAILY', 'fast'];

async function chat(messages, modelIndex = 0) {
  const currentModel = FALLBACK_MODELS[modelIndex] || 'brain';
const url = `${OMNIROUTE_URL}/v1/chat/completions`;
console.log('DEBUG: Full URL being called:', url);
console.log('DEBUG: OMNIROUTE_URL value:', OMNIROUTE_URL);
console.log('DEBUG: API KEY exists?', OMNIROUTE_API_KEY ? 'YES' : 'NO');

  try {
    const response = await axios.post(
      url,
      {
        model: currentModel,
        messages: messages
      },
      {
        headers: {
          'Authorization': `Bearer ${OMNIROUTE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15s timeout
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(`Model ${currentModel} failed:`, error.response ? error.response.status : error.message);
    
    // If we have another fallback model to try, try it!
    if (modelIndex + 1 < FALLBACK_MODELS.length) {
      console.log(`Retrying with fallback model: ${FALLBACK_MODELS[modelIndex + 1]}...`);
      return chat(messages, modelIndex + 1);
    }

    throw new Error(error.response ? (error.response.data?.error?.message || `Status ${error.response.status}`) : error.message);
  }
}

module.exports = { chat };