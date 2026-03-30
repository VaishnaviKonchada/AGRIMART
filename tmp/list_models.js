const https = require('https');
const key = 'AIzaSyCKgdXnd9BjCodxtZ36gI-wvuARgOGO4vU';
https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    if (json.models) {
      console.log(json.models.map(m => m.name).join('\n'));
    } else {
      console.log(body);
    }
  });
});
