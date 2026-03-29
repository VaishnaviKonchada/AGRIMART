import express from 'express';
import {
  getAllDistricts
} from './data/testData.js';

const app = express();

app.get('/test', (req, res) => {
  try {
    const districts = getAllDistricts();
    res.json({ success: true, count: districts.length, districts: districts.slice(0, 3) });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.listen(8082, () => {
  console.log('Test server running on 8082');
});
