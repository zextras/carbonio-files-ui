/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

module.exports = {
	extends: ['./node_modules/@zextras/carbonio-ui-configs/rules/eslint.js'],
	plugins: ['notice', 'no-autofix'],
	overrides: [
		{
			// enable eslint-plugin-testing-library rules or preset only for test files
			files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
			extends: ['plugin:jest-dom/recommended', 'plugin:testing-library/react'],
			rules: {
				'testing-library/no-node-access': 'off',
				'jest-dom/prefer-enabled-disabled': 'off',
				'no-autofix/jest-dom/prefer-enabled-disabled': 'warn'
			}
		},
		{
			// disable check for license header on graphql files
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
		},
		{
			files: [
				'**/mocks/**/*.[jt]s?(x)',
				'**/types/**/*.[jt]s?(x)',
				'**/jest-*.ts?(x)',
				'**/test*.ts?(x)'
			],
			rules: {
				'import/no-extraneous-dependencies': 'off'
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
	rules: {
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
		],
		'sonarjs/cognitive-complexity': 'warn'
	},
	ignorePatterns: ['notice.template.js']
};
