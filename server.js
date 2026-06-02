const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS mood_logs (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id),
                journal_text TEXT NOT NULL,
                sentiment VARCHAR(50) NOT NULL,
                score INT NOT NULL,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database & Auth tables synced successfully.");
    } catch (err) {
        console.error("DB Init Error:", err);
    }
};
initDB();

const analyzeSentiment = (text) => {
    const lowerText = text.toLowerCase();
    const positiveWords = ['happy', 'joy', 'great', 'awesome', 'good', 'peaceful', 'excited', 'productive', 'calm', 'hopeful'];
    const negativeWords = ['sad', 'anxious', 'stress', 'depressed', 'bad', 'angry', 'tired', 'overwhelmed', 'fear', 'lost'];
    
    let score = 0;
    positiveWords.forEach(word => { if (lowerText.includes(word)) score += 2; });
    negativeWords.forEach(word => { if (lowerText.includes(word)) score -= 2; });

    if (score > 1) return { sentiment: 'Positive', score };
    if (score < -1) return { sentiment: 'Negative', score };
    return { sentiment: 'Neutral', score: (score === 0 ? 1 : score) }; 
};

// --- AUTHENTICATION APIs ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, password]);
        res.json({ success: true, userId: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Username already exists. Please choose another." });
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT id FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length === 0) return res.status(401).json({ error: "Invalid username or password" });
        res.json({ success: true, userId: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- APP APIs ---
app.post('/api/journal', async (req, res) => {
    const { userId, text } = req.body;
    if (!text || !userId) return res.status(400).json({ error: "Text and User ID are required" });

    const { sentiment, score } = analyzeSentiment(text);
    try {
        await pool.query('INSERT INTO mood_logs (user_id, journal_text, sentiment, score) VALUES ($1, $2, $3, $4)', [userId, text, sentiment, score]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mood_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 30', [req.params.userId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));