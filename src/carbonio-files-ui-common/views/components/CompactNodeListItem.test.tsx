/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { CompactNodeListItem } from './CompactNodeListItem';
import { ICON_REGEXP } from '../../constants/test';
import { populateFile, populateFolder } from '../../mocks/mockUtils';
import { setup, screen } from '../../tests/utils';

describe('CompactNodeListItem', () => {
	describe('Navigate button visibility', () => {
		it('should render the navigate button when the node is a folder', () => {
			const folder = populateFolder();
			setup(<CompactNodeListItem node={folder} />);
			expect(screen.getByTestId(ICON_REGEXP.navigateIntoFolder)).toBeVisible();
		});

		it('should not render the navigate button when the node is a file', () => {
			const file = populateFile();
			setup(<CompactNodeListItem node={file} />);
			expect(screen.queryByTestId(ICON_REGEXP.navigateIntoFolder)).not.toBeInTheDocument();
		});
	});
});
