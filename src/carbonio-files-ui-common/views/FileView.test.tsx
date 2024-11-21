/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import FileView from './FileView';
import { setup, spyOnUseCreateOptions } from '../tests/utils';

describe('FileView', () => {
	it('should not show any newAction', () => {
		const createOptions = spyOnUseCreateOptions();
		setup(<FileView />);
		expect(createOptions).toHaveLength(0);
	});
});
