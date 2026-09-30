/**
 * AI-Powered Synthesizer - Uses brain model to intelligently merge
 * multiple responses into single superior answer
 */

const axios = require('axios');
const { injectProfile } = require('./profile');

const OMNIROUTE_URL = process.env.OMNIROUTE_URL;
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY;

/**
 * Intelligently synthesizes multiple responses into one superior answer
 * @param {string} originalQuery - User's original question
 * @param {Array} rankedResponses - Sorted array from judge (best first)
 * @returns {Object} {synthesized: string, sources: Array, method: string}
 */
async function synthesize(originalQuery, rankedResponses) {
  if (!rankedResponses || rankedResponses.length === 0) {
    return {
      synthesized: "No responses available to synthesize.",
      sources: [],
      method: "none"
    };
  }

  // If only one response, return it directly (with profile injection in original query)
  if (rankedResponses.length === 1) {
    return {
      synthesized: rankedResponses[0].response,
      sources: [rankedResponses[0].model],
      method: "single"
    };
  }

  try {
    // Build synthesis prompt
    const synthesisPrompt = buildSynthesisPrompt(originalQuery, rankedResponses);
    
    // Inject HD profile into synthesis request
    const profiledQuery = injectProfile(synthesisPrompt, 'detailed');

    // Use brain model for intelligent synthesis
    const synthesisResponse = await axios.post(
      `${OMNIROUTE_URL}/query`,
      {
        combo: "brain",
        messages: [
          {
            role: "system",
            content: profiledQuery.system + "\n\nYou are a synthesis expert. Merge multiple AI responses into ONE superior answer that captures the best insights from all sources. Maintain HD's direct communication style."
          },
          {
            role: "user",
            content: profiledQuery.user
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OMNIROUTE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      synthesized: synthesisResponse.data.response,
      sources: rankedResponses.map(r => ({
        model: r.model,
        score: r.score,
        reasoning: r.reasoning
      })),
      method: "ai_synthesis"
    };

  } catch (error) {
    console.error("AI synthesis failed, using best response:", error.message);
    
    // Fallback: return highest-scored response
    return {
      synthesized: rankedResponses[0].response,
      sources: rankedResponses.map(r => ({
        model: r.model,
        score: r.score
      })),
      method: "fallback_best",
      error: error.message
    };
  }
}

/**
 * Builds synthesis prompt for brain model
 */
function buildSynthesisPrompt(query, rankedResponses) {
  let prompt = `Original Question: "${query}"\n\n`;
  prompt += `I queried ${rankedResponses.length} AI models. Synthesize their responses into ONE superior answer.\n\n`;

  rankedResponses.forEach((resp, idx) => {
    prompt += `--- Response ${idx + 1}: ${resp.model} (Score: ${resp.score}/100) ---\n`;
    prompt += `${resp.response}\n\n`;
  });

  prompt += `Task: Create a single unified answer that:\n`;
  prompt += `1. Takes the best insights from all responses\n`;
  prompt += `2. Eliminates redundancy\n`;
  prompt += `3. Resolves contradictions by favoring higher-scored responses\n`;
  prompt += `4. Maintains direct, technical communication (no fluff)\n`;
  prompt += `5. Is complete and actionable\n\n`;
  prompt += `Output ONLY the synthesized answer, no meta-commentary.`;

  return prompt;
}

/**
 * Alternative: Simple concatenation with deduplication (not used, kept for reference)
 */
function simpleMerge(rankedResponses) {
  const best = rankedResponses[0];
  const others = rankedResponses.slice(1);

  let merged = `${best.response}\n\n`;
  
  others.forEach(resp => {
    // Add unique insights from lower-scored responses
    const uniqueLines = resp.response
      .split('\n')
      .filter(line => !best.response.includes(line) && line.trim().length > 20);
    
    if (uniqueLines.length > 0) {
      merged += `Additional insights:\n${uniqueLines.join('\n')}\n\n`;
    }
  });

  return merged.trim();
}

module.exports = { synthesize };
