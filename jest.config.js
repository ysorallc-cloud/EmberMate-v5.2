// ============================================================================
// JEST CONFIGURATION
// For testing EmberMate storage utilities and React Native components
// ============================================================================

module.exports = {
  // Use Node environment for utility testing
  testEnvironment: 'node',

  // Test environment setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // TypeScript support via ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Path aliases to match tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],

  // Coverage configuration
  collectCoverageFrom: [
    'utils/**/*.ts',
    '!utils/**/*.test.ts',
    '!utils/__tests__/**',
    '!**/node_modules/**',
  ],

  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Module path ignore patterns
  modulePathIgnorePatterns: ['<rootDir>/node_modules/.cache'],

  // Timeout for async tests
  testTimeout: 10000,

  // Clear mock call data between tests, but NOT mock implementations
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};
