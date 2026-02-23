/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import graphql from '@rollup/plugin-graphql';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: '.env' });

const retry = process.env.TEST_RETRY_TIMES ? parseInt(process.env.TEST_RETRY_TIMES, 10) : 2;
const isCI = process.env.CI === 'true';

export default defineConfig({
	plugins: [
		react({
			jsxImportSource: '@emotion/react',
			babel: {
				plugins: ['@emotion/babel-plugin']
			}
		}),
		graphql()
	],
	test: {
		reporters: isCI ? ['default', 'junit'] : ['verbose'],
		retry,
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
				'**/types/',
				'**/mocks/',
				'**/tests/',

				// Test files
				'**/*.test.{ts,tsx}',
				'**/*.spec.{ts,tsx}',

				// Type definitions
				'**/*.d.ts',

				// Test utilities
				'**/setupTests.{ts,tsx}',
				'**/testUtils.{ts,tsx}',
				'**/test-utils.{ts,tsx}',

				// Test folders
				'**/__tests__/**',
				'**/__mocks__/**',

				// Build artifacts
				'**/dist/**',
				'**/coverage/**',
				'**/node_modules/**',

				'**/(test|mock)*.ts?(x)',
				'**/resolverMocks.ts',
				'**/resolvers.ts',
				'**/dist/**',
				'**/coverage/**'
			],
			thresholds: {
				branches: 75,
				functions: 75,
				lines: 75,
				statements: 75
			}
		},
		include: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
		exclude: ['node_modules', '**/test.ts'],
		outputFile: {
			junit: './junit.xml'
		}
	}
});
