/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

module.exports = {
	transform: {
		'^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './babel.config.jest.js' }],
		'\\.(gql|graphql)$': 'jest-transform-graphql',
		'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
			'<rootDir>/src/mocks/fileTransformer.js'
	},
	moduleDirectories: ['node_modules'],
	collectCoverage: true,
	collectCoverageFrom: [
		'src/**/*.{js,ts}(x)?',
		'!src/**/mocks/*', // exclude msw handlers
		'!src/mocks/*' // exclude msw handlers
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'cobertura'],
	moduleNameMapper: {
		'react-pdf/dist/esm/entry.webpack': 'react-pdf'
	},
	reporters: ['default', 'jest-junit'],
	// testMatch: ['/test/**/*.js?(x)'],
	setupFilesAfterEnv: ['<rootDir>/src/jest-env-setup.ts', '<rootDir>/src/jest-mocks.ts'],
	setupFiles: ['<rootDir>/src/jest-polyfills.ts'],
	globals: {
		IS_SERVER: false
	},
	testEnvironment: 'jsdom'
};
