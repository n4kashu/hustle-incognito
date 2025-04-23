// .eslintrc.cjs
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier', // Make sure this is last to override other configs
  ],
  rules: {
    'prettier/prettier': 'warn', // Show Prettier issues as warnings
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn on unused vars, ignore if prefixed with _
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow implicit return types for functions
    '@typescript-eslint/no-explicit-any': 'warn', // Warn on explicit 'any'
    // Add any project-specific rules here
  },
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  ignorePatterns: ['node_modules/', 'dist/', '.eslintrc.cjs', '*.config.js', '*.config.cjs'],
};
