const fs = require('fs');

const updates = {
  en: "Home",
  hi: "होम",
  te: "హోమ్"
};

['en', 'hi', 'te'].forEach(lang => {
  const p = 'src/locales/' + lang + '.json';
  if (fs.existsSync(p)) {
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!json.farmerDashboard) {
      json.farmerDashboard = {};
    }
    json.farmerDashboard.dashboard = updates[lang];
    fs.writeFileSync(p, JSON.stringify(json, null, 2));
    console.log("Updated " + lang);
  }
});
