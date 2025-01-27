import client from 'prom-client';

export const metrics = {
  orderCounter: new client.Counter({
    name: 'orders_total',
    help: 'Total number of orders'
  }),
  errorCounter: new client.Counter({
    name: 'errors_total',
    help: 'Total number of errors'
  }),
  orderProcessingTime: new client.Histogram({
    name: 'order_processing_duration_seconds',
    help: 'Time spent processing orders',
    buckets: [0.1, 0.5, 1, 2, 5]
  })
};