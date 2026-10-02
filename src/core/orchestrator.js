/**
 * Orchestrator - Manages DAILY vs SUPREME mode execution
 * DAILY: Single fast query with profile
 * SUPREME: Parallel queries → AI judge → AI synthesis
 */

const axios = require('axios');
const { injectProfile } = require('./profile');
const { judgeResponses } = require('./judge');
const { synthesize } = require('./synthesizer');

const OMNIROUTE_URL = process.env.OMNIROUTE_URL || 'https://omniroute-production-7900.up.railway.app';
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY || 'sk-6e958441448cf5b4-b2fd96-fcc53dd0';

/**
 * DAILY Mode - Fast single response with profile injection
 */
async function dailyMode(messages) {
  const lastMessage = messages[messages.length - 1];
  const profiled = injectProfile(lastMessage.content, 'standard');

  // Rebuild messages with profile injection
  const profiledMessages = [
    { role: 'system', content: profiled.system },
    ...messages.slice(0, -1),
    { role: 'user', content: profiled.user }
  ];

  try {
    const response = await axios.post(
      `${OMNIROUTE_URL}/v1/chat/completions`,
      {
        model: "DAILY",
        messages: profiledMessages
      },
      {
        headers: {
          'Authorization': `Bearer ${OMNIROUTE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    return {
      mode: 'daily',
      response: response.data.choices[0].message.content,
      model: response.data.model || 'DAILY',
      latency: response.data.latency || 0
    };
  } catch (error) {
    throw new Error(`DAILY mode failed: ${error.message}`);
  }
}

/**
 * SUPREME Mode - Parallel multi-model with AI judge + synthesis
 */
async function supremeMode(messages) {
  const lastMessage = messages[messages.length - 1];
  const originalQuery = lastMessage.content;
  const profiled = injectProfile(originalQuery, 'detailed');

  // Models to query in parallel (best performers from brain combo)
  const models = [
    { model: 'brain', priority: 1 },
    { model: 'fast', priority: 2 },
    { model: 'DAILY', priority: 2 }
  ];

  const startTime = Date.now();

  try {
    // Parallel queries with profile injection
    const queryPromises = models.map(async ({ model, priority }) => {
      try {
        const profiledMessages = [
          { role: 'system', content: profiled.system },
          ...messages.slice(0, -1),
          { role: 'user', content: profiled.user }
        ];

        const response = await axios.post(
          `${OMNIROUTE_URL}/v1/chat/completions`,
          {
            model: model,
            messages: profiledMessages
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
          model: response.data.model || model,
          response: response.data.choices[0].message.content,
          latency: response.data.latency || 0,
          priority
        };
      } catch (error) {
        console.error(`Model ${model} failed:`, error.message);
        return null;
      }
    });

    // Wait for all responses
    const results = (await Promise.all(queryPromises)).filter(r => r !== null);

    if (results.length === 0) {
      throw new Error('All models failed in SUPREME mode');
    }

    // AI-powered judging
    const rankedResponses = await judgeResponses(originalQuery, results);

    // AI-powered synthesis
    const synthesisResult = await synthesize(originalQuery, rankedResponses);

    const totalLatency = Date.now() - startTime;

    return {
      mode: 'supreme',
      response: synthesisResult.synthesized,
      metadata: {
        models_queried: results.length,
        synthesis_method: synthesisResult.method,
        sources: synthesisResult.sources,
        total_latency: totalLatency,
        individual_responses: rankedResponses.map(r => ({
          model: r.model,
          score: r.score,
          reasoning: r.reasoning,
          latency: r.latency
        }))
      }
    };

  } catch (error) {
    throw new Error(`SUPREME mode failed: ${error.message}`);
  }
}

module.exports = {
  dailyMode,
  supremeMode
};
