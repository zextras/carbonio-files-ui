/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const { DefinePlugin } = require('webpack');
module.exports = (wpConf, pkg, options, mode) => {
	// enable loader for graphql files to be able to use the import notation
	wpConf.module.rules.push({
		test: /\.(graphql|gql)$/,
		exclude: /node_modules/,
		loader: 'graphql-tag/loader'
	});
	return wpConf
	// wpConf.plugins.push(
	// 	new DefinePlugin({
	// 		IS_SERVER: JSON.stringify(!!options.server)
	// 	})
	// );
};
