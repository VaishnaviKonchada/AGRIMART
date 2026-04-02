const fs = require('fs');
const path = require('path');

const statusKeysEn = {
  "Pending": "Pending",
  "Confirmed": "Confirmed",
  "Accepted": "Accepted",
  "In Transit": "In Transit",
  "Delivered": "Delivered",
  "Cancelled": "Cancelled"
};

const statusKeysHi = {
  "Pending": "लंबित",
  "Confirmed": "पुष्टि की गई",
  "Accepted": "स्वीकार कर लिया",
  "In Transit": "मार्ग में",
  "Delivered": "पहुंचाया गया",
  "Cancelled": "रद्द किया गया"
};

const statusKeysTe = {
  "Pending": "పెండింగ్‌లో ఉంది",
  "Confirmed": "నిర్ధారించబడింది",
  "Accepted": "ఆమోదించబడింది",
  "In Transit": "రవాణాలో ఉంది",
  "Delivered": "డెలివరీ అయింది",
  "Cancelled": "రద్దు చేయబడింది"
};

function update(fileName, lang) {
  const filePath = path.join(process.cwd(), 'src', 'locales', fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // 1. customerAccount.location
  if (!data.customerAccount) data.customerAccount = {};
  data.customerAccount.location = lang === 'hi' ? "स्थान" : (lang === 'te' ? "స్థానం" : "Location");
  
  // 2. admin.farmers.statusPending
  if (data.admin && data.admin.farmers) {
    data.admin.farmers.statusPending = lang === 'hi' ? "लंबित" : (lang === 'te' ? "పెండింగ్‌లో ఉంది" : "Pending");
  }
  
  // 3. admin.orders.statusKeys
  if (data.admin && data.admin.orders) {
    data.admin.orders.statusKeys = lang === 'hi' ? statusKeysHi : (lang === 'te' ? statusKeysTe : statusKeysEn);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${fileName}`);
}

update('en.json', 'en');
update('hi.json', 'hi');
update('te.json', 'te');
