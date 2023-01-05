/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

module.exports = {
	extends: ['./node_modules/@zextras/carbonio-ui-configs/rules/eslint.js'],
	plugins: ['unused-imports', 'jest-dom', 'testing-library', 'notice'],
	overrides: [
		{
			// enable eslint-plugin-testing-library rules or preset only for test files
			files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
			extends: ['plugin:jest-dom/recommended', 'plugin:testing-library/react'],
			rules: {
				'testing-library/no-node-access': 'off',
				'jest-dom/prefer-enabled-disabled': 'off',
				'testing-library/no-unnecessary-act': 'warn',
				'testing-library/no-global-regexp-flag-in-query': 'error',
				'testing-library/prefer-user-event': 'warn'
			}
		},
		{
			// disable check for licence header on graphql files
			files: ['*.graphql'],
			rules: {
				'notice/notice': 'off'
			}
		},
		{
			files: ['**/graphql/*/*.graphql'],
			extends: ['plugin:@graphql-eslint/operations-recommended'],
			rules: {
				'@graphql-eslint/known-type-names': 'error'
			}
		},
		{
			files: ['*schema.graphql'],
			extends: ['plugin:@graphql-eslint/schema-recommended'],
			rules: {
				'@graphql-eslint/known-type-names': 'error'
			}
		},
		{
			files: ['schema.graphql'],
			rules: {
				'@graphql-eslint/naming-convention': 'off',
				'@graphql-eslint/require-description': 'off',
				'@graphql-eslint/no-typename-prefix': 'off',
				'@graphql-eslint/strict-id-in-types': 'off',
				'@graphql-eslint/description-style': 'off'
			}
		}
	],
	parserOptions: {
		schema: [
			'src/carbonio-files-ui-common/graphql/schema.graphql',
			'src/carbonio-files-ui-common/graphql/client-schema.graphql'
		],
		operations: 'src/carbonio-files-ui-common/graphql/**/*.graphql'
	},
	globals: {
		IS_SERVER: 'readonly'
	},
	rules: {
		'import/order': [
			'error',
			{
				groups: [['builtin', 'external']],
				pathGroups: [
					{
						pattern: 'react',
						group: 'external',
						position: 'before'
					}
				],
				pathGroupsExcludedImportTypes: ['react'],
				'newlines-between': 'always',
				alphabetize: {
					order: 'asc',
					caseInsensitive: true
				}
			}
		],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'unused-imports/no-unused-imports': 'error',
		'unused-imports/no-unused-vars': [
			'warn',
			{ vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }
		],
		'no-shadow': 'off',
		'@typescript-eslint/no-shadow': ['error'],
		'import/no-extraneous-dependencies': 'off',
		'no-console': ['warn', { allow: ['error'] }],
		'no-param-reassign': [
			'error',
			{
				ignorePropertyModificationsFor: ['accumulator', 'mockedNode']
			}
		],
		'notice/notice': [
			'error',
			{
				templateFile: './notice.template.js'
			}
		]
	},
	settings: {
		react: {
			version: 'detect'
		}
	},
	ignorePatterns: ['notice.template.js']
};
