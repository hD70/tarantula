const { createClient } = require('@libsql/client');

// Get credentials from environment variables
const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://main-hd07.aws-ap-south-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA2MTExNTQsImlkIjoiMDFhMGU4YjMtZDQwMS03ZjUzLTk3MjMtYzk0ZmIxMzgyODc0Iiwia2lkIjoiMVRiYUFGLXFHRndkR0NSY3YyMi1EM2tjMjZFM0gtUGVuTlpDSFhNQ3RPbyIsInJpZCI6ImI5MDIyMWE1LTNkNWQtNDhkOS04MzhkLWJkNmU2NDkxMzgzOCJ9.WcO51Inl9g8j-oRJxfz9Rd3GtECSPYk9USq1j7ziCXh1xbXyUqfcL8TGuYJkTOPTkKL2opeHtPuUd23d3hb-DQ';

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
