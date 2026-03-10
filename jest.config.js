export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json'
      },
    ],
  },
  testMatch: [
    '<rootDir>/libs/sdk/src/**/__tests__/**/*.test.ts',
    '<rootDir>/libs/sdk/src/**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'libs/sdk/src/**/*.ts',
    '!libs/sdk/src/**/*.d.ts',
    '!libs/sdk/src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
