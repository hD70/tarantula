const { db } = require('../db/setup');

class MemoryManager {
  constructor() {
    this.maxContextTokens = 8000;
    this.shortTermCache = new Map();
  }

  async getOrCreateConversation(sessionId) {
    const result = await db.execute({
      sql: 'SELECT * FROM conversations WHERE session_id = ?',
      args: [sessionId]
    });
    
    let conversation = result.rows[0];
    
    if (!conversation) {
      const insertResult = await db.execute({
        sql: 'INSERT INTO conversations (session_id) VALUES (?)',
        args: [sessionId]
      });
      conversation = { id: insertResult.lastInsertRowid, session_id: sessionId };
    }
    
    return conversation;
  }

  async saveMessage(sessionId, role, content, metadata = {}) {
    const conversation = await this.getOrCreateConversation(sessionId);
    const tokenCount = Math.ceil(content.length / 4);
    
    await db.execute({
      sql: `INSERT INTO messages (conversation_id, role, content, token_count) VALUES (?, ?, ?, ?)`,
      args: [conversation.id, role, content, tokenCount]
    });
    
    if (!this.shortTermCache.has(sessionId)) {
      this.shortTermCache.set(sessionId, []);
    }
    this.shortTermCache.get(sessionId).push({ role, content });
  }

  async loadContext(sessionId, maxTokens = this.maxContextTokens) {
    const conversation = await this.getOrCreateConversation(sessionId);
    
    if (this.shortTermCache.has(sessionId)) {
      const cached = this.shortTermCache.get(sessionId);
      if (this.estimateTokens(cached) <= maxTokens) {
        return cached;
      }
    }
    
    const result = await db.execute({
      sql: `SELECT role, content, token_count FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC`,
      args: [conversation.id]
    });
    
    const messages = result.rows;
    let totalTokens = 0;
    const resultMessages = [];
    
    for (const msg of messages) {
      if (totalTokens + msg.token_count > maxTokens) break;
      resultMessages.unshift({ role: msg.role, content: msg.content });
      totalTokens += msg.token_count;
    }
    
    return resultMessages;
  }

  estimateTokens(messages) {
    return messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
  }

  clearShortTerm(sessionId) {
    this.shortTermCache.delete(sessionId);
  }

  async getSummary(sessionId) {
    const conversation = await this.getOrCreateConversation(sessionId);
    const result = await db.execute({
      sql: `SELECT summary FROM memory_summaries WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [conversation.id]
    });
    
    return result.rows[0] ? result.rows[0].summary : null;
  }
}

module.exports = MemoryManager;
