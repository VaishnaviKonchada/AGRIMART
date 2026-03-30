const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const EN_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/en.json';
const HI_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/hi.json';
const TE_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/te.json';
const TRANSLATE_URL = 'http://localhost:8081/api/translate';

async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  // If text is just a placeholder or very short, maybe keep it? e.g. "{{count}}"
  if (text.startsWith('{{') && text.endsWith('}}') && !text.includes(' ')) return text;

  try {
    const response = await fetch(TRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang })
    });
    const data = await response.json();
    if (data.error) {
      console.error(`Error translating "${text.substring(0, 20)}..." to ${targetLang}:`, data.error);
      return null; // Return null to indicate failure
    }
    return data.translatedText || text;
  } catch (err) {
    console.error(`Fetch error for ${targetLang}:`, err.message);
    return null;
  }
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
      // Translate if missing OR if it's the same as English (and multi-word, so likely untranslated)
      const looksEnglish = targetVal === enVal && enVal.includes(' ');
      if (!targetVal || looksEnglish) {
        console.log(`Translating [${key}]: "${enVal}" to ${targetLang}`);
        const translated = await translateText(enVal, targetLang);
        if (translated) {
          result[key] = translated;
          await sleep(500); // 500ms delay to avoid rate limits
        } else {
          result[key] = targetVal || enVal; // Fallback
        }
      }
    }
  }
  return result;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  
  // Hindi
  if (fs.existsSync(HI_PATH)) {
    const hi = JSON.parse(fs.readFileSync(HI_PATH, 'utf8'));
    console.log('--- Updating Hindi Translation ---');
    const newHi = await translateObject(en, 'Hindi', hi);
    fs.writeFileSync(HI_PATH, JSON.stringify(newHi, null, 2), 'utf8');
    console.log('Hindi update complete.');
  }

  // Telugu
  if (fs.existsSync(TE_PATH)) {
    const te = JSON.parse(fs.readFileSync(TE_PATH, 'utf8'));
    console.log('--- Updating Telugu Translation ---');
    const newTe = await translateObject(en, 'Telugu', te);
    fs.writeFileSync(TE_PATH, JSON.stringify(newTe, null, 2), 'utf8');
    console.log('Telugu update complete.');
  }
}

main().catch(console.error);
