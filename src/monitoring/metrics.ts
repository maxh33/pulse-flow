import client, { Counter } from 'prom-client';
import { Express } from 'express';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const orderCounter = new client.Counter({
  name: 'orders_processed_total',
  help: 'Total number of processed orders'
});

export const setupMetrics = (app: Express) => {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  });
};

export const errorCounter = new Counter({
  name: 'error_counter',
  help: 'Total number of errors'
});
