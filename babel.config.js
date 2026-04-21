/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

module.exports = (api) => {
	let presetEnv;
	const plugins = ['@emotion'];
	if (api.env('test')) {
		presetEnv = [
			'@babel/preset-env',
			{
				useBuiltIns: 'usage',
				corejs: 3.49,
				modules: 'commonjs'
			}
		];
		plugins.push('babel-plugin-transform-import-meta');
	} else {
		presetEnv = [
			'@babel/preset-env',
			{
				useBuiltIns: 'usage',
				corejs: 3.49
			}
		];
	}
	return {
		presets: [presetEnv, '@babel/preset-react', '@babel/preset-typescript'],
		plugins
	};
};
