// Configuración compartida de ESLint (flat config) para todo el monorepo.
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

const COMMON_RULES = {
  'max-lines': ['error', { max: 300 }],
  'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
};

export default [
  {
    ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**', '.specify/**', '.claude/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: COMMON_RULES,
  },
  {
    files: ['frontend/**/*.{js,jsx}'],
    ignores: ['frontend/vite.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...COMMON_RULES,
      // Solo clases de Tailwind: el atributo style está prohibido en JSX (principio I).
      // eslint-plugin-react (react/forbid-dom-props) aún no admite ESLint 10.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="style"]',
          message: 'Usa clases de Tailwind en lugar del atributo style.',
        },
      ],
    },
  },
  {
    files: ['frontend/tests/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];
