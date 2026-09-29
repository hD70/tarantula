const { createClient } = require('@libsql/client');

// Get credentials from environment variables
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

// Initialize Turso database
const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN
});

// Create tables
(async () => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        token_count INTEGER
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS memory_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        summary TEXT NOT NULL,
        message_range TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_session_id ON conversations(session_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_conversation_messages ON messages(conversation_id)`);

    console.log('✅ Tarantula database initialized (Turso)');
  } catch (error) {
    console.error('Database setup error:', error);
  }
})();

module.exports = db;
