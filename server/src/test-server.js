import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8081;

console.log('[1] Starting minimal test server...');
console.log('[2] Port:', port);

app.use(express.json());

app.get('/api/health', (req, res) => {
  console.log('[HTTP] Health check request received');
  res.json({ ok: true, ts: Date.now() });
});

app.get('/', (req, res) => {
  console.log('[HTTP] Root request received');
  res.json({ message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR] Express error:', err);
  res.status(500).json({ error: err.message });
});

console.log('[3] About to listen...');
console.log('[4] Process ID:', process.pid);

try {
  const server = app.listen(port, 'localhost', function() {
    console.log('[5] ✅ Server callback fired!');
    console.log('[6] Server listening on http://localhost:' + port);
  });

  console.log('[7] Listen call returned');

  server.on('listening', () => {
    console.log('[8] Server "listening" event fired');
  });

  server.on('error', (err) => {
    console.error('[ERROR] Server error event:', err.message, err.code);
    process.exit(1);
  });

  server.on('close', () => {
    console.log('[SERVER] Server closed');
  });
} catch (e) {
  console.error('[CATCH] Exception during listen:', e.message);
  process.exit(1);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED_REJECTION]:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]:', error.message);
  process.exit(1);
});

console.log('[9] Script continues...');

