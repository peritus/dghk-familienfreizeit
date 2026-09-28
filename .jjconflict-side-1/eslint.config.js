import js from '@eslint/js'
import globals from 'globals'
import stylistic from '@stylistic/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const browserFiles = ['src/app/**/*.{ts,tsx}', 'src/modules/*/app/**/*.{ts,tsx}']
const workerFiles = ['src/worker/**/*.ts', 'src/modules/*/worker/**/*.ts']
const pureFiles = [
  'src/derive/**/*.ts',
  'src/events/fold.ts',
  'src/events/resolver.ts',
  'src/solver/**/*.ts',
  'src/config/**/*.ts',
  'src/modules/**/*.ts',
  'profiles/**/*.ts',
  'spec/profiles/**/*.example.ts',
]
const naming = [
  'error',
  {
    selector: ['variable', 'function'],
    format: ['camelCase', 'PascalCase'],
    leadingUnderscore: 'allow',
  },
  { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
  { selector: 'typeLike', format: ['PascalCase'] },
  {
    selector: ['typeProperty', 'objectLiteralProperty'],
    format: ['snake_case'],
    filter: {
      regex:
        '^(Bindings|ASSETS|DB|[A-Z_]+|[0-9]+|className|onClick|tabIndex|aria-.*|data-.*|getDerivedStateFromError|componentDidCatch|children|nativeButton|defaultVariants|noShadow|FamilyInvited|FamilyEmailChanged|PersonAdded|PersonUpdated|PersonWithdrawn|LabelSet|LabelCleared|isOrganiser|httpOnly|sameSite|maxAge|minimumFractionDigits|maximumFractionDigits|argTypes|cssVariable|borderRadius|boxShadow|initialState|beforeEach)$|^[a-z][a-z0-9]*(-[a-z0-9]+)+$',
      match: false,
    },
  },
]

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.wrangler/**',
      'node_modules/**',
      'storybook-static/**',
      'test-results/**',
      'worker-configuration.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { plugins: { '@stylistic': stylistic } },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: ['type', 'interface', 'enum', 'class', 'function'],
          next: ['type', 'interface', 'enum', 'class', 'function'],
        },
        { blankLine: 'always', prev: 'export', next: 'export' },
      ],
    },
  },
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  {
    files: ['**/*.{js,mjs}', '*config.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'profiles/**/*.ts', 'spec/profiles/**/*.example.ts'],
    rules: { '@typescript-eslint/naming-convention': naming },
  },
  {
    files: browserFiles,
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        { patterns: ['**/worker', '**/worker/**', 'node:*', 'cloudflare:*', 'hono', 'hono/*'] },
      ],
    },
  },
  {
    files: workerFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/app', '**/app/**', 'react', 'react/*', 'react-dom', 'react-dom/*'] },
      ],
    },
  },
  {
    files: pureFiles,
    ignores: ['src/modules/*/app/**', 'src/modules/*/worker/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        'Date',
        'fetch',
        'process',
        'document',
        'window',
        'crypto',
      ],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '**/worker',
            '**/worker/**',
            '**/app',
            '**/app/**',
            'node:*',
            'cloudflare:*',
            'react',
            'react/*',
            'hono',
            'hono/*',
          ],
        },
      ],
    },
  },
)
