import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

function runPrediction({ imagePath, modelPath, labelsPath, solutionsPath }) {
  const pythonExec = process.env.PYTHON_EXECUTABLE || path.resolve(process.cwd(), '..', '.venv', 'Scripts', 'python.exe');
  const scriptPath = path.resolve(process.cwd(), 'ml', 'predict_disease.py');
  const timeoutMs = Number(process.env.DISEASE_PREDICTION_TIMEOUT_MS || 180000);

  const args = [
    scriptPath,
    '--model', modelPath,
    '--labels', labelsPath,
    '--image', imagePath,
    '--solutions', solutionsPath,
    '--top-k', '3',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExec, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Prediction timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        return reject(new Error(stderr || `Predict script failed with code ${code}`));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Invalid prediction output: ${stdout || err.message}`));
      }
    });
  });
}

router.get('/status', async (req, res) => {
  const modelPath = process.env.DISEASE_MODEL_PATH || path.resolve(process.cwd(), 'ml', 'artifacts', 'model.keras');
  const labelsPath = process.env.DISEASE_LABELS_PATH || path.resolve(process.cwd(), 'ml', 'artifacts', 'labels.json');
  const solutionsPath = process.env.DISEASE_SOLUTIONS_PATH || path.resolve(process.cwd(), 'ml', 'disease_solutions.json');

  try {
    await fs.access(modelPath);
    await fs.access(labelsPath);
    await fs.access(solutionsPath);

    return res.json({
      ok: true,
      modelReady: true,
      message: 'Disease model and labels are available',
    });
  } catch {
    return res.json({
      ok: true,
      modelReady: false,
      message: 'Model artifacts are missing. Train model first.',
    });
  }
});

router.post('/predict', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required. Use form-data key image.' });
  }

  const modelPath = process.env.DISEASE_MODEL_PATH || path.resolve(process.cwd(), 'ml', 'artifacts', 'model.keras');
  const labelsPath = process.env.DISEASE_LABELS_PATH || path.resolve(process.cwd(), 'ml', 'artifacts', 'labels.json');
  const solutionsPath = process.env.DISEASE_SOLUTIONS_PATH || path.resolve(process.cwd(), 'ml', 'disease_solutions.json');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agrimart-disease-'));
  const ext = path.extname(req.file.originalname || '.jpg') || '.jpg';
  const tempImagePath = path.join(tempDir, `upload${ext}`);

  try {
    await fs.writeFile(tempImagePath, req.file.buffer);

    const prediction = await runPrediction({
      imagePath: tempImagePath,
      modelPath,
      labelsPath,
      solutionsPath,
    });

    return res.json({
      ok: true,
      ...prediction,
    });
  } catch (error) {
    console.error('[DISEASE_PREDICT_ERROR]', error.message);
    return res.status(500).json({
      error: 'Failed to run disease prediction',
      details: error.message,
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

export default router;
