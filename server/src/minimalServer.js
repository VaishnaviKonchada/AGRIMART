import express from 'express';

const app = express();

app.get('/test', (req, res) => {
  res.json({ ok: true });
});

const port = 9998;
app.listen(port, () => {
  console.log(`Server on ${port}`);
});

setTimeout(() => {
  console.log('Still running...');
}, 5000);
