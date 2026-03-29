import express from 'express';
import { getAllDistricts } from './data/apDistrictsMandals.js';

const app = express();

app.get('/test/districts', (req, res) => {
  console.log('[TEST] Endpoint hit');
  try {
    console.log('[TEST] Calling getAllDistricts...');
    const districts = getAllDistricts();
    console.log('[TEST] Got', districts.length, 'districts');
    res.json({ success: true, count: districts.length, districts });
  } catch (error) {
    console.error('[TEST] Error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

const port = 9999;
app.listen(port, () => {
  console.log(`✅ Test server running on ${port}`);
});
