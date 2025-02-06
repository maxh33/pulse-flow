import express from 'express';
import { register } from '../monitoring/metrics';
import { Registry } from 'prom-client';

const router = express.Router();

router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error instanceof Error ? error.message : 'Unknown error');
  }
});

export default router; 