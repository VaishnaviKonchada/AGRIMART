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
    const regex = /t\(['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      keys[match[1]] = "TODO";
    }
  } catch(e) {}
});

function getMissingKeys(jsonPath) {
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return Object.keys(keys).filter(k => {
    const parts = k.split('.');
    let obj = json;
    for (let p of parts) {
      if (!obj || !obj[p]) return true;
      obj = obj[p];
    }
    return false;
  });
}

const missingEn = getMissingKeys('src/locales/en.json');
const missingHi = getMissingKeys('src/locales/hi.json');
const missingTe = getMissingKeys('src/locales/te.json');

const fullMissing = {
  en: missingEn,
  hi: missingHi,
  te: missingTe,
};

fs.writeFileSync('missing_keys_all.json', JSON.stringify(fullMissing, null, 2));
console.log("Missing En:", missingEn.length, "Hi:", missingHi.length, "Te:", missingTe.length);
