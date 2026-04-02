const fs = require('fs');
const path = require('path');

const updates = {
  'en.json': { location: 'Location', statusPending: 'Pending', statusKeys: { 
    Pending: "Pending", 
    Confirmed: "Confirmed", 
    Accepted: "Accepted", 
    "In Transit": "In Transit", 
    Delivered: "Delivered", 
    Cancelled: "Cancelled" 
  }},
  'hi.json': { location: 'स्थान', statusPending: 'लंबित', statusKeys: { 
    Pending: "लंबित", 
    Confirmed: "पुष्टि की गई", 
    Accepted: "स्वीकार कर लिया", 
    "In Transit": "मार्ग में", 
    Delivered: "पहुंचाया गया", 
    Cancelled: "रद्द किया गया" 
  }},
  'te.json': { location: 'స్థానం', statusPending: 'పెండింగ్‌లో ఉంది', statusKeys: { 
    Pending: "పెండింగ్‌లో ఉంది", 
    Confirmed: "నిర్ధారించబడింది", 
    Accepted: "ఆమోదించబడింది", 
    "In Transit": "రవాణాలో ఉంది", 
    Delivered: "డెలివరీ అయింది", 
    Cancelled: "రద్దు చేయబడింది" 
  }}
};

for (const [file, keys] of Object.entries(updates)) {
  const filePath = path.join(process.cwd(), 'src', 'locales', file);
  if (!fs.existsSync(filePath)) continue;
  
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.customerAccount) data.customerAccount = {};
  data.customerAccount.location = keys.location;
  
  if (!data.admin) data.admin = {};
  if (!data.admin.farmers) data.admin.farmers = {};
  data.admin.farmers.statusPending = keys.statusPending;
  
  if (!data.admin.orders) data.admin.orders = {};
  data.admin.orders.statusKeys = keys.statusKeys;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Verified ${file} update`);
}
