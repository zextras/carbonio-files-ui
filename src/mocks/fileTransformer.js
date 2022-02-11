/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// @see https://jestjs.io/docs/webpack
module.exports = {
	process(src, filename, _config, _options) {
		return `module.exports = ${JSON.stringify(path.basename(filename))};`;
	}
};
