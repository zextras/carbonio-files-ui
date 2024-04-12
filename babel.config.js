/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				useBuiltIns: 'usage',
				corejs: 3.36
			}
		],
		'@babel/preset-react',
		'@babel/preset-typescript'
	],
	plugins: ['babel-plugin-styled-components']
};
