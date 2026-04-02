const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config({ path: 'server/.env' });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
  if (!apiKey) {
    console.error('No API key found in server/.env');
    return;
  }
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
      const names = data.models.map(m => m.name).filter(n => n.includes('gemini'));
      console.log('Available models:', JSON.stringify(names, null, 2));
    } else {
      console.error('Error fetching models:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

test();
