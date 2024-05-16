/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { formatDate } from './utils';

describe('formatDate function', () => {
	it('should format date based on system locale (en) and as 2-digits day, 2-digits month, 4-digits year by default', () => {
		const date = new Date(2024, 4, 9);
		const result = formatDate(date);
		expect(result).toBe('05/09/2024');
	});

	it('should format date based on given locale', () => {
		const date = new Date(2024, 4, 9);
		const result = formatDate(date, 'it');
		expect(result).toBe('09/05/2024');
	});

	it.each(['astronauta', 'astronauta-locale'])(
		'should format date based on system locale if invalid locale arg is set (%s)',
		(locale) => {
			const date = new Date(2024, 4, 9);
			const result = formatDate(date, locale);
			expect(result).toBe('05/09/2024');
		}
	);

	it('should format date based on the given locale if the locale arg is valid but with underscores', () => {
		const date = new Date(2024, 4, 9);
		const result = formatDate(date, 'pt_BR');
		expect(result).toBe('09/05/2024');
	});

	it('should format date based on the given locale language if the locale arg has a valid language but an invalid subtag', () => {
		const date = new Date(2024, 4, 9);
		const result = formatDate(date, 'pt-ASTRONAUTA');
		expect(result).toBe('09/05/2024');
	});

	it('should format date with given format options', () => {
		const date = new Date(2024, 4, 9, 7, 5);
		const result = formatDate(date, undefined, {
			day: 'numeric',
			month: 'long',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
		expect(result).toBe('May 9, 24 at 07:05 AM');
	});

	it.each([null, undefined, ''])('should return an empty string if date is "%s"', (date) => {
		const result = formatDate(date);
		expect(result).toBe('');
	});

	it('should format date from a valid string', () => {
		const result = formatDate('Jun 15, 23');
		expect(result).toBe('06/15/2023');
	});

	it('should throw error if string date is invalid', () => {
		expect(() => formatDate('invalid')).toThrow();
	});

	it('should format date from a numeric timestamp with milliseconds', () => {
		const result = formatDate(938255034000);
		expect(result).toBe('09/25/1999');
	});

	it('should return 01/01/1970 if numeric date is 0', () => {
		const result = formatDate(0);
		expect(result).toBe('01/01/1970');
	});

	it('should return date before 01/01/1970 if numeric date is negative', () => {
		const result = formatDate(-86400000);
		expect(result).toBe('12/31/1969');
	});
});
