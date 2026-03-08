const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const prettierPlugin = require('eslint-plugin-prettier');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.config.js',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'jest.setup.js',
      'test-*.js',
    ],
  },
  // Extend expo config using compat layer
  ...compat.extends('expo'),
  // Main configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
      // Allow console.error but warn on console.log
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // React Native specific
      'react-native/no-inline-styles': 'off',
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/array-type': 'off',
      // General code quality
      'prefer-const': 'warn',
      'no-var': 'error',
      // Allow empty arrow functions
      '@typescript-eslint/no-empty-function': 'off',
      // Disable React Compiler rules (too strict for this codebase)
      'react-compiler/react-compiler': 'off',
      // Disable new strict React Hooks rules (causes false positives with React Native patterns)
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
    },
  },
  // Disable Buffer error for Node.js utilities
  {
    files: ['utils/**/*.ts'],
    rules: {
      'no-undef': 'off', // Buffer is available in React Native
    },
  },
];
