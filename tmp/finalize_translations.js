const fs = require('fs');
const https = require('https');

const EN_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/en.json';
const HI_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/hi.json';
const TE_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/te.json';
const GEMINI_API_KEY = 'AIzaSyCKgdXnd9BjCodxtZ36gI-wvuARgOGO4vU';

function translateText(text, targetLang) {
  return new Promise((resolve, reject) => {
    if (!text || typeof text !== 'string') return resolve(text);
    if (text.startsWith('{{') && text.endsWith('}}') && !text.includes(' ')) return resolve(text);

    const prompt = `Translate this agricultural e-commerce text into ${targetLang}: "${text}". Only return the translation.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const data = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) return resolve(null);
          const translated = json.candidates?.[0]?.content?.parts?.[0]?.text;
          resolve(translated ? translated.trim() : null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', e => resolve(null));
    req.write(data);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateObject(enObj, targetLang, targetObj = {}) {
  const result = { ...targetObj };
  for (const key in enObj) {
    const enVal = enObj[key];
    const targetVal = targetObj[key];

    if (typeof enVal === 'object' && enVal !== null) {
      result[key] = await translateObject(enVal, targetLang, targetVal || {});
    } else {
      const looksEnglish = targetVal === enVal && enVal.includes(' ');
      if (!targetVal || looksEnglish) {
        console.log(`Translating [${key}]: "${enVal}" to ${targetLang}`);
        const translated = await translateText(enVal, targetLang);
        if (translated) {
          result[key] = translated;
          await sleep(50); 
        } else {
          result[key] = targetVal || enVal;
        }
      }
    }
  }
  return result;
}

async function main() {
  console.log('Final full sync of translations...');
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  
  console.log('--- Hindi ---');
  let hi = fs.existsSync(HI_PATH) ? JSON.parse(fs.readFileSync(HI_PATH, 'utf8')) : {};
  hi = await translateObject(en, 'Hindi', hi);
  fs.writeFileSync(HI_PATH, JSON.stringify(hi, null, 2), 'utf8');

  console.log('--- Telugu ---');
  let te = fs.existsSync(TE_PATH) ? JSON.parse(fs.readFileSync(TE_PATH, 'utf8')) : {};
  te = await translateObject(en, 'Telugu', te);
  fs.writeFileSync(TE_PATH, JSON.stringify(te, null, 2), 'utf8');
  
  console.log('Done.');
}

main().catch(console.error);
