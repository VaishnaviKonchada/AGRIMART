const fs = require('fs');

async function translate(text, targetLang) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map(x => x[0]).join('');
  } catch (e) {
    console.error("Translation failed for:", text, e.message);
    return text;
  }
}

async function main() {
  const strings = JSON.parse(fs.readFileSync('tmp/extracted_strings.json', 'utf8'));
  const hi = JSON.parse(fs.readFileSync('src/locales/hi.json', 'utf8'));
  const te = JSON.parse(fs.readFileSync('src/locales/te.json', 'utf8'));
  const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));

  let count = 0;
  for (const str of strings) {
    if (!en[str]) en[str] = str;
    
    if (!hi[str]) {
      // Small delay to prevent rate limit
      await new Promise(r => setTimeout(r, 100));
      hi[str] = await translate(str, 'hi');
      count++;
      if (count % 10 === 0) console.log(`Translated ${count}/${strings.length} for hi`);
    }
  }

  console.log("Done hindi. Moving to telugu...");
  count = 0;
  for (const str of strings) {
    if (!te[str]) {
       // te
       await new Promise(r => setTimeout(r, 100));
       te[str] = await translate(str, 'te');
       count++;
       if (count % 10 === 0) console.log(`Translated ${count}/${strings.length} for te`);
    }
  }

  fs.writeFileSync('src/locales/en.json', JSON.stringify(en, null, 2), 'utf8');
  fs.writeFileSync('src/locales/hi.json', JSON.stringify(hi, null, 2), 'utf8');
  fs.writeFileSync('src/locales/te.json', JSON.stringify(te, null, 2), 'utf8');
  console.log("Translation complete!");
}

main().catch(console.error);
