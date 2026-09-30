const express = require('express');
const cors = require('cors');
const { setupDatabase } = require('./src/db/setup');
const MemoryManager = require('./src/core/memory');
const { dailyMode, supremeMode } = require('./src/core/orchestrator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize
let memoryManager;

async function initialize() {
  try {
    await setupDatabase();
    memoryManager = new MemoryManager();
    console.log('✅ Database and Memory initialized');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Tarantula is alive 🕷️',
    layers: ['Routing ✅', 'Memory ✅', 'Orchestration ✅'],
    endpoints: {
      daily: '/chat/daily',
      supreme: '/chat/supreme',
      history: '/history/:sessionId'
    }
  });
});

/**
 * DAILY Mode Endpoint - Fast single model with memory
 */
app.post('/chat/daily', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const session = sessionId || `session_${Date.now()}`;

    // Load conversation history from memory
    const history = await memoryManager.loadContext(session);

    // Build messages array
    const messages = [
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Execute DAILY mode
    const result = await dailyMode(messages);

    // Save to memory
    await memoryManager.saveMessage(session, 'user', message);
    await memoryManager.saveMessage(session, 'assistant', result.response, {
      mode: 'daily',
      model: result.model,
      latency: result.latency
    });

    res.json({
      sessionId: session,
      response: result.response,
      mode: 'daily',
      model: result.model,
      latency: result.latency
    });

  } catch (error) {
    console.error('DAILY mode error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * SUPREME Mode Endpoint - Multi-model with AI judge + synthesis
 */
app.post('/chat/supreme', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const session = sessionId || `session_${Date.now()}`;

    // Load conversation history from memory
    const history = await memoryManager.loadContext(session);

    // Build messages array
    const messages = [
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Execute SUPREME mode
    const result = await supremeMode(messages);

    // Save to memory
    await memoryManager.saveMessage(session, 'user', message);
    await memoryManager.saveMessage(session, 'assistant', result.response, {
      mode: 'supreme',
      ...result.metadata
    });

    res.json({
      sessionId: session,
      response: result.response,
      mode: 'supreme',
      metadata: result.metadata
    });

  } catch (error) {
    console.error('SUPREME mode error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation history
 */
app.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await memoryManager.loadContext(sessionId);
    
    res.json({
      sessionId,
      messageCount: history.length,
      messages: history
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`🕷️  Tarantula listening on port ${PORT}`);
  });
});
