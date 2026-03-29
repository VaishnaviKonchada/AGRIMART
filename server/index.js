const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const translateProxy = require('./translateProxy');

const app = express();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(bodyParser.json());

// Translation proxy endpoint
app.use('/api/translate', translateProxy);

// Health check
app.get('/', (req, res) => {
  res.send('AgriMart Server Running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
