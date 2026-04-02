const fs = require('fs');
const files = [
  'src/farmer/FarmerOrders.js',
  'src/farmer/FarmerDashboard.js',
  'src/pages/FarmerCropDetails.js',
  'src/farmer/AddCrop.js',
  'src/farmer/CropChatbot.js',
  'src/farmer/MyCrops.js'
];
const keys = {};
files.forEach(f => {
  try {
    const code = fs.readFileSync(f, 'utf8');
    // Match t('key', 'fallback') or t("key", "fallback")
    // Also handling objects or extra arguments is hard with simple regex, but we just need keys.
    // simpler regex: t(['"]([^'"]+)['"]
    const regex = /t\(['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      keys[match[1]] = "VALUE_PLACEHOLDER";
    }
  } catch (err) {
    console.error("Error reading " + f);
  }
});

const enFile = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const missingInEn = Object.keys(keys).filter(k => {
  const parts = k.split('.');
  let obj = enFile;
  for (let p of parts) {
    if (!obj[p]) return true;
    obj = obj[p];
  }
  return false;
});

console.log("Found keys:", Object.keys(keys).length);
console.log("Missing in en.json:", missingInEn.length);
fs.writeFileSync('missing_keys.json', JSON.stringify({ missing: missingInEn }, null, 2));
