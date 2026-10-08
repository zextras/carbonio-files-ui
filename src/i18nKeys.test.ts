/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

// this file is in src
const SRC_DIR = import.meta.dirname;
// static keys of t('…'), t?.('…') and i18nKey="…"; keys built with a template literal are skipped
const KEY_REGEXP = /(?:\bt(?:\?\.)?\(|i18nKey=\{?)\s*(['"`])([\w.-]+)\1/g;

function collectKeys(): Set<string> {
	const files = readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' })
		.map((file) => file.split(sep).join('/'))
		.filter(
			(file) =>
				/\.tsx?$/.test(file) &&
				!/\.test\.tsx?$/.test(file) &&
				!/(^|\/)(mocks|__mocks__|tests)\//.test(file)
		);
	return new Set(
		files.flatMap((file) =>
			Array.from(
				readFileSync(join(SRC_DIR, file), 'utf8').matchAll(KEY_REGEXP),
				(match) => match[2]
			)
		)
	);
}

describe('i18n keys', () => {
	/*
	 * Weblate saves the translations as nested JSON, where a key is either a string or a container of
	 * other keys. When the code uses a key for both, one of the two cannot be translated (CO-4447) or
	 * resolves to an object and shows an i18next error (CO-3918).
	 * Limits: only the static keys are checked, not the ones built with a template literal or passed
	 * through a prop or a variable; the translation files are not in this repo, so they are not
	 * checked; a container read on purpose with returnObjects, with static children, would be
	 * reported as a collision.
	 */
	it('should not use a key both as a string and as the container of other keys', () => {
		const keys = collectKeys();
		// an empty scan would pass without checking anything
		expect(keys.size).toBeGreaterThan(0);
		const collisions = Array.from(keys).flatMap((key) =>
			key
				.split('.')
				.slice(0, -1)
				.map((_, index, parts) => parts.slice(0, index + 1).join('.'))
				.filter((parent) => keys.has(parent))
				.map((parent) => `${parent} is also the container of ${key}`)
		);
		expect(collisions).toEqual([]);
	});
});
