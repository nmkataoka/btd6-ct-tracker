module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:import/errors',
    'plugin:import/warnings',
    'airbnb',
    'airbnb-typescript',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    project: './tsconfig.json',
  },
  plugins: ['prettier', '@typescript-eslint'],
  rules: {
    'object-curly-spacing': ['error', 'always'],
    indent: ['off'],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'import/prefer-default-export': 0,
  },
  env: {
    // change as necessary
    node: true,
  },
}
