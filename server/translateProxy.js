// Express.js AI proxy for Gemini (Translation and Chat)
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// POST /api/translate
router.post('/', async (req, res) => {
  const { text, targetLang, mode, context } = req.body;
  
  if (!text && mode !== 'chat') {
    return res.status(400).json({ error: 'Missing text' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY || process.env.Gemini_API_Key;
  if (!apiKey) {
    console.error("❌ Gemini API Key missing in environment variables!");
    return res.status(500).json({ error: 'Gemini API key is not configured in .env' });
  }

  try {
    let prompt = '';
    if (mode === 'chat') {
      prompt = `You are an expert Agricultural Assistant for the AgriMart platform in India. 
      The user is a farmer. Answer the following question accurately, concisely, and in ${targetLang || 'English'}.
      Use a helpful and professional tone. If the user asks about crops, soil, or pests, provide evidence-based agricultural advice.
      
      User Question: ${text}
      ${context ? `Context: ${context}` : ''}`;
    } else if (mode === 'guidance') {
      prompt = `You are a professional agricultural expert. 
      Generate or translate a detailed crop growing procedure for "${text}" into ${targetLang || 'English'}.
      Include numbers for steps. Focus on:
      1. Seed Selection/Preparation
      2. Planting/Transplanting
      3. Irrigation
      4. Fertilizers
      5. Pest/Disease Control
      6. Harvesting
      
      Return ONLY the translated/generated steps directly, no extra text.`;
    } else if (mode === 'prediction') {
      prompt = `You are a professional agricultural expert and translator. 
      Translate the following crop disease analysis report into ${targetLang || 'English'}.
      Convert technical identifiers like "Apple___Apple_scab" into natural, readable plant and disease names.
      Ensure the tone is helpful for a farmer. 
      
      Report to translate:
      ${text}
      
      Return ONLY the final translated report directly, no extra explanations.`;
    } else {
      // Default: Translation mode
      prompt = `You are a professional translator for an agricultural e-commerce application in India.
      Translate the following text into ${targetLang || 'English'}.
      Only return the final translated text directly, with no extra quotes, formatting, or explanations.

      Text to translate:
      ${text}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
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
    
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
       return res.status(500).json({ error: 'Invalid response from AI model' });
    }

    // Wrap in appropriate key based on mode
    if (mode === 'chat') {
      res.json({ reply: resultText.trim() });
    } else if (mode === 'guidance') {
      res.json({ procedure: resultText.trim() });
    } else {
      res.json({ translatedText: resultText.trim() });
    }
  } catch (err) {
    console.error('AI Proxy Exception:', err);
    res.status(500).json({ error: 'AI request failed', details: err.message });
  }
});

module.exports = router;

