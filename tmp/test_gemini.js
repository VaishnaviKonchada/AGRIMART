const https = require('https');
const key = 'AIzaSyCKgdXnd9BjCodxtZ36gI-wvuARgOGO4vU';
const data = JSON.stringify({
  contents: [{ parts: [{ text: 'Translate "Hello" to Telugu' }] }]
});
const opt = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};
const req = https.request(opt, (res) => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log(b));
});
req.write(data);
req.end();
