const fs = require('fs');

const updates = {
  en: "I hereby confirm the above details are true",
  hi: "मैं एतद्द्वारा पुष्टि करता/करती हूँ कि उपरोक्त विवरण सत्य हैं",
  te: "పై వివరాలు నిజమని నేను ఇందుమూలంగా ధృవీకరిస్తున్నాను"
};

['en', 'hi', 'te'].forEach(lang => {
  const p = `src/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  json["I hereby confirm the above details are true"] = updates[lang];
  fs.writeFileSync(p, JSON.stringify(json, null, 2));
  console.log(`Updated ${lang}.json`);
});
