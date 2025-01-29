export const grafanaConfig = {
  cloudUrl: process.env.GRAFANA_CLOUD_URL,
  apiKey: process.env.GRAFANA_API_KEY,
  dashboards: {
    orderMetrics: {
      uid: 'order-metrics',
      title: 'Order Metrics Dashboard'
    }
  },
  datasources: {
    prometheus: {
      type: 'prometheus',
      name: 'Prometheus',
      url: 'http://prometheus:9090'
    }
  },
  metrics: {
    path: '/metrics',
    prefix: 'pulse_flow_',
    defaultLabels: {
      app: 'pulse-flow',
      environment: process.env.NODE_ENV || 'development'
    }
  }
};