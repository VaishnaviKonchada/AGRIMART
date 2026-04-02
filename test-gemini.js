const fetch = require('node-fetch');

const apiKey = 'AIzaSyCKgdXnd9BjCodxtZ36gI-wvuARgOGO4vU';
const prompt = "Translate 'Red Apple' to Hindi. Only return the translated text.";

async function testGemini() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    console.log('Gemini Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testGemini();
