module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/*.integration.test.ts'],
  maxWorkers: 1,
  testTimeout: 30000
}; 