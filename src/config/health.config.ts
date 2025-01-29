export const healthConfig = {
    path: '/healthz',
    statusCode: 200,
    response: {
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    }
};