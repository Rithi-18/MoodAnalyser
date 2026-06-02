const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves your stunning frontend

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Auto-initialize database tables
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mood_logs (
                id SERIAL PRIMARY KEY,
                journal_text TEXT NOT NULL,
                sentiment VARCHAR(50) NOT NULL,
                score INT NOT NULL,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database synced successfully.");
    } catch (err) {
        console.error("DB Init Error:", err);
    }
};
initDB();

// Advanced Rule-Based NLP Logic
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

// API Endpoints
app.post('/api/journal', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const { sentiment, score } = analyzeSentiment(text);
    
    try {
        const result = await pool.query(
            'INSERT INTO mood_logs (journal_text, sentiment, score) VALUES ($1, $2, $3) RETURNING *',
            [text, sentiment, score]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mood_logs ORDER BY logged_at DESC LIMIT 30');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));