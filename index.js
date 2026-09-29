const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { chat } = require('./src/core/omniroute');
const memory = require('./src/core/memory');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.json({ message: 'Tarantula is alive 🕷️', layers: ['Routing ✅', 'Memory ✅'] });
});

app.post('/chat', async (req, res) => {
  try {
    const { messages, sessionId } = req.body;
    const session = sessionId || uuidv4();
    
    // Load recent context from memory
    const contextMessages = await memory.getRecentContext(session);
    
    // Get user's new message
    const userMessage = messages[messages.length - 1];
    
    // Save user message to memory
    await memory.saveMessage(session, userMessage.role, userMessage.content);
    
    // Build full context (old + new)
    const fullContext = [...contextMessages, userMessage];
    
    // Send to Omniroute
    const reply = await chat(fullContext);
    
    // Save AI response to memory
    await memory.saveMessage(session, 'assistant', reply);
    
    res.json({ reply, sessionId: session });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await memory.getRecentContext(sessionId);
    res.json({ sessionId, messages: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🕷️ Tarantula running on port ${PORT}`);
  console.log(`Layers active: Routing ✅ | Memory ✅`);
});
