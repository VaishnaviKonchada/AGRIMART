// Express.js translation proxy for LibreTranslate
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// POST /api/translate
router.post('/', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Missing text or targetLang' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured in .env' });
  }

  try {
    const prompt = `You are a professional translator for an agricultural e-commerce application in India.
Translate the following text into ${targetLang}.
Only return the final translated text directly, with no extra quotes, formatting, or explanations.

Text to translate:
${text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Gemini API Error:', data.error.message);
      return res.status(500).json({ error: data.error.message });
    }
    
    let translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!translatedText) {
       return res.status(500).json({ error: 'Invalid response from AI model' });
    }

    res.json({ translatedText: translatedText.trim() });
  } catch (err) {
    console.error('Translation Exception:', err);
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
});

module.exports = router;
