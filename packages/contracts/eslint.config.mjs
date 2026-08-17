import eslint from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    rules: {
      'max-depth': ['error', 2],
      'no-else-return': 'error',
      'sonarjs/cognitive-complexity': ['error', 10],
      'sonarjs/no-nested-conditional': 'error',
    },
  },
);
