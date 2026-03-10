const path = require('path');

module.exports = {
  extends: ['../../.eslintrc.json'],
  ignorePatterns: [],
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.eslint.json'),
    tsconfigRootDir: __dirname,
  },
};
