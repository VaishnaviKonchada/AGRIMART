const fs = require('fs');
const https = require('https');

const EN_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/en.json';
const HI_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/hi.json';
const TE_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/te.json';
const GEMINI_API_KEY = 'AIzaSyCKgdXnd9BjCodxtZ36gI-wvuARgOGO4vU';

function translateText(text, targetLang) {
  return new Promise((resolve) => {
    if (!text || typeof text !== 'string') return resolve(text);
    if (text.startsWith('{{') && text.endsWith('}}') && !text.includes(' ')) return resolve(text);

    const prompt = `Translate to ${targetLang}: "${text}". Only return the translation.`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const data = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

    const req = https.request(url, { method: 'POST', timeout: 5000, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          if (json.error) {
              console.error(`Gemini Error [${targetLang}]:`, json.error.message);
              return resolve(null);
          }
          const translated = json.candidates?.[0]?.content?.parts?.[0]?.text;
          resolve(translated ? translated.trim() : null);
        } catch (e) {
            console.error('Parse Error:', e.message);
            resolve(null);
        }
      });
    });
    req.on('timeout', () => {
        req.destroy();
        console.error('Request Timeout');
        resolve(null);
    });
    req.on('error', (err) => {
        console.error('Request Error:', err.message);
        resolve(null);
    });
    req.write(data);
    req.end();
  });
}

async function fastTranslate(obj, targetLang, targetObj = {}) {
    const result = JSON.parse(JSON.stringify(targetObj));
    const tasks = [];

    const walk = (en, res, parentKey = '') => {
        for (const key in en) {
            if (typeof en[key] === 'object' && en[key] !== null) walk(en[key], res[key] || (res[key] = {}), `${parentKey}.${key}`);
            else {
                const isEnglish = (res[key] === en[key] && en[key].includes(' '));
                if (!res[key] || isEnglish) tasks.push({ en: en[key], res, key });
            }
        }
    };

    walk(obj, result);
    console.log(`Processing ${tasks.length} translations for ${targetLang}...`);

    for (let i = 0; i < tasks.length; i += 5) {
        const chunk = tasks.slice(i, i + 5);
        await Promise.all(chunk.map(async t => {
            const trans = await translateText(t.en, targetLang);
            if (trans) t.res[t.key] = trans;
        }));
        if (i % 25 === 0) console.log(`Done ${i}/${tasks.length}`);
    }
    return result;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  
  console.log('--- Hindi ---');
  let hi = fs.existsSync(HI_PATH) ? JSON.parse(fs.readFileSync(HI_PATH, 'utf8')) : {};
  hi = await fastTranslate(en, 'Hindi', hi);
  fs.writeFileSync(HI_PATH, JSON.stringify(hi, null, 2), 'utf8');

  console.log('--- Telugu ---');
  let te = fs.existsSync(TE_PATH) ? JSON.parse(fs.readFileSync(TE_PATH, 'utf8')) : {};
  te = await fastTranslate(en, 'Telugu', te);
  fs.writeFileSync(TE_PATH, JSON.stringify(te, null, 2), 'utf8');
  console.log('Sync Complete.');
}

main().catch(e => console.error('Main Error:', e));
