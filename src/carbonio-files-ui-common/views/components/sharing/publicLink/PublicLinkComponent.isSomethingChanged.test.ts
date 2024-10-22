/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { faker } from '@faker-js/faker';

import { calculateIsAccessCodeChanged, calculateIsExpirationChanged } from './PublicLinkComponent';
import { generateAccessCode } from '../../../../utils/utils';

describe('Public Link component is something changed', () => {
	describe('calculateIsAccessCodeChanged', () => {
		it('should throw an error if the old access code is an empty string', () => {
			const canCalculateIsAccessCodeChanged: () => ReturnType<
				typeof calculateIsAccessCodeChanged
			> = () => calculateIsAccessCodeChanged('', generateAccessCode(), true);
			expect(canCalculateIsAccessCodeChanged).toThrow('Unexpected access code length 0');
		});

		it('should throw an error if the new access code is an empty string', () => {
			const canCalculateIsAccessCodeChanged: () => ReturnType<
				typeof calculateIsAccessCodeChanged
			> = () => calculateIsAccessCodeChanged(generateAccessCode(), '', true);
			expect(canCalculateIsAccessCodeChanged).toThrow('Unexpected access code length 0');
		});

		it.each([[undefined, null]])(
			'should return true when the access code was not set and the user sets it',
			(oldAccessCode) => {
				expect(
					calculateIsAccessCodeChanged(oldAccessCode, generateAccessCode(), true)
				).toBeTruthy();
			}
		);

		it.each([[undefined, null]])(
			'should return false when was unset and remains unset ',
			(oldAccessCode) => {
				expect(
					calculateIsAccessCodeChanged(oldAccessCode, generateAccessCode(), false)
				).toBeFalsy();
			}
		);

		it('should return false when was set and remains the same', () => {
			const accessCode = generateAccessCode();
			expect(calculateIsAccessCodeChanged(accessCode, accessCode, true)).toBeFalsy();
		});

		it('should return true when the access code was set and the user regenerates it', () => {
			expect(
				calculateIsAccessCodeChanged(generateAccessCode(), generateAccessCode(), true)
			).toBeTruthy();
		});

		it('should return true when the access code was set and the user unset it', () => {
			expect(
				calculateIsAccessCodeChanged(generateAccessCode(), generateAccessCode(), false)
			).toBeTruthy();
		});
	});

	describe('CalculateIsExpirationChanged', () => {
		it.each([null, undefined])(
			'should return true if the expiration date was not set (%s) and then the user sets it',
			(expiresAt) => {
				expect(
					calculateIsExpirationChanged(expiresAt, faker.date.future().setHours(23, 59, 59))
				).toBeTruthy();
			}
		);

		it.each([
			[null, undefined],
			[undefined, null],
			[null, null],
			[undefined, undefined]
		])(
			'should return false if the expiration date was not set and the users does not set it',
			(expiresAt, updatedTimestamp) => {
				expect(calculateIsExpirationChanged(expiresAt, updatedTimestamp)).toBeFalsy();
			}
		);

		it.each([null, undefined])(
			'should return true if the expiration date was set and the user unset it',
			(updatedTimestamp) => {
				expect(
					calculateIsExpirationChanged(faker.date.future().setHours(23, 59, 59), updatedTimestamp)
				).toBeTruthy();
			}
		);

		it('should return true if the expiration date was set and the user changes it', () => {
			expect(
				calculateIsExpirationChanged(
					faker.date.future().setHours(23, 59, 59),
					faker.date.future().setHours(23, 59, 59)
				)
			).toBeTruthy();
		});

		it('should return false if the expiration date was set and the users does not set it', () => {
			const expirationDate = faker.date.future().setHours(23, 59, 59);
			expect(calculateIsExpirationChanged(expirationDate, expirationDate)).toBeFalsy();
		});
	});
});
