/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import graphql from '@rollup/plugin-graphql';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: ['@emotion/babel-plugin']
			}
		}),
		graphql()
	],
	define: {
		BASE_PATH: JSON.stringify('/')
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['src/setupTests.ts'],
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		testTimeout: 60000,
		coverage: {
			enabled: true,
			provider: 'v8',
			reporter: ['text', 'cobertura', 'lcov'],
			reportsDirectory: 'coverage',
			include: ['src/**/*.{js,ts,jsx,tsx}'],
			exclude: [
				'node_modules/',
				'src/mocks/',
				'src/types/',
				'src/tests/',
				'src/carbonio-files-ui-common/mocks/',
				'src/carbonio-files-ui-common/tests/',
				'src/carbonio-files-ui-common/types/',
				'**/(test|mock)*.ts?(x)',
				'**/resolverMocks.ts',
				'**/resolvers.ts'
			],
			thresholds: {
				branches: 75,
				functions: 75,
				lines: 75,
				statements: 75
			}
		},
		include: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
		exclude: ['node_modules', 'constants/test.ts'],
		reporters: ['default', 'junit'],
		outputFile: {
			junit: './junit.xml'
		}
	}
});
