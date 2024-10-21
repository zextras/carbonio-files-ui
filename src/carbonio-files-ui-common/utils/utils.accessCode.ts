/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export const generateAccessCodeWithCrypto = (length: number): string => {
	let generatedPassword = '';
	const numbers = '0123456789';
	const lowerCaseLetters = 'abcdefghijklmnopqrstuvwxyz';
	const capitalLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const validChars = numbers + lowerCaseLetters + capitalLetters;

	for (let i = 0; i < length; i += 1) {
		let randomNumber = crypto.getRandomValues(new Uint32Array(1))[0];
		randomNumber /= 0x100000000;
		randomNumber = Math.floor(randomNumber * validChars.length);

		generatedPassword += validChars[randomNumber];
	}

	return generatedPassword;
};

export const generateAccessCodeFallback = (length: number): string => {
	let pass = '';
	const numbers = '0123456789';
	const lowerCaseLetters = 'abcdefghijklmnopqrstuvwxyz';
	const capitalLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const validChars = numbers + lowerCaseLetters + capitalLetters;

	for (let i = 1; i <= length; i += 1) {
		const char = Math.floor(Math.random() * validChars.length + 1);
		pass += validChars.charAt(char);
	}

	return pass;
};
