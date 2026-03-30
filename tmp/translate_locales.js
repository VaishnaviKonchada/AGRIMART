const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const EN_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/en.json';
const HI_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/hi.json';
const TE_PATH = 'c:/Users/konch/OneDrive/Desktop/agrimart-client/src/locales/te.json';
const TRANSLATE_URL = 'http://localhost:8081/api/translate';

async function translateText(text, targetLang) {
  try {
    const response = await fetch(TRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang })
    });
    const data = await response.json();
    if (data.error) {
      console.error(`Error translating to ${targetLang}:`, data.error);
      return text;
    }
    return data.translatedText || text;
  } catch (err) {
    console.error(`Fetch error for ${targetLang}:`, err.message);
    return text;
  }
}

async function translateObject(obj, targetLang, existingObj = {}) {
  const result = { ...existingObj };
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = await translateObject(obj[key], targetLang, existingObj[key] || {});
    } else {
      // Only translate if missing or if it's a new key
      if (!existingObj[key]) {
        console.log(`Translating [${key}]: "${obj[key]}" to ${targetLang}`);
        result[key] = await translateText(obj[key], targetLang);
      }
    }
  }
  return result;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  
  // Hindi
  let hi = {};
  if (fs.existsSync(HI_PATH)) hi = JSON.parse(fs.readFileSync(HI_PATH, 'utf8'));
  console.log('Starting Hindi translation...');
  const newHi = await translateObject(en, 'Hindi', hi);
  fs.writeFileSync(HI_PATH, JSON.stringify(newHi, null, 2), 'utf8');
  console.log('Hindi translation saved.');

  // Telugu
  let te = {};
  if (fs.existsSync(TE_PATH)) te = JSON.parse(fs.readFileSync(TE_PATH, 'utf8'));
  console.log('Starting Telugu translation...');
  const newTe = await translateObject(en, 'Telugu', te);
  fs.writeFileSync(TE_PATH, JSON.stringify(newTe, null, 2), 'utf8');
  console.log('Telugu translation saved.');
}

main().catch(console.error);
