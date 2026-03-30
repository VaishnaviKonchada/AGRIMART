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

    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          const translated = json.candidates?.[0]?.content?.parts?.[0]?.text;
          resolve(translated ? translated.trim() : null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

async function fastTranslate(obj, targetLang, targetObj = {}) {
  const result = { ...targetObj };
  const tasks = [];

  const walk = (en, res, parentKey = '') => {
    for (const key in en) {
      if (typeof en[key] === 'object' && en[key] !== null) {
        res[key] = res[key] || {};
        walk(en[key], res[key], `${parentKey}.${key}`);
      } else {
        const looksUntranslated = !res[key] || (res[key] === en[key] && en[key].includes(' '));
        if (looksUntranslated) {
          tasks.push({ en: en[key], res, key });
        }
      }
    }
  };

  walk(obj, result);
  console.log(`Speeding up: Missing ${tasks.length} translations for ${targetLang}`);

  const CONCURRENCY = 10;
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const chunk = tasks.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (t) => {
      const trans = await translateText(t.en, targetLang);
      if (trans) t.res[t.key] = trans;
    }));
    console.log(`Progress: ${Math.min(i + CONCURRENCY, tasks.length)}/${tasks.length}`);
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
}

main().catch(console.error);
