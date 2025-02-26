module.exports = {
  ...require('./jest.config'),
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  testTimeout: 60000,
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup.ts'
  ],
  globals: {
    'ts-jest': {
      diagnostics: {
        warnOnly: true,
        ignoreCodes: [2571, 6133, 7006]
      }
    }
  }
}; 