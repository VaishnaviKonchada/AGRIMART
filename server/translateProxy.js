// Express.js translation proxy for LibreTranslate
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// POST /api/translate
router.post('/', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;
  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ error: 'Missing text, sourceLang, or targetLang' });
  }
  try {
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' })
    });
    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: data.error });
    }
    res.json({ translatedText: data.translatedText });
  } catch (err) {
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
});

module.exports = router;
