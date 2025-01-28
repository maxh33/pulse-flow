export const healthConfig = {
  path: '/health',
  timeout: 5000,
  statusCode: 200,
  responseType: 'json',
  response: {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }
};