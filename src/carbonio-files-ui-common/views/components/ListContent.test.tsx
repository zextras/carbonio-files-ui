/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ListContent } from './ListContent';
import { SELECTORS } from '../../constants/test';
import { populateNode } from '../../mocks/mockUtils';
import { makeListItemsVisible, screen, setup } from '../../tests/utils';

describe('ListContent', () => {
	it('should render list item only when it becomes visible', () => {
		const node = populateNode();
		setup(<ListContent nodes={[node]} />);
		expect(screen.getByTestId(SELECTORS.virtualizedNodeListItem)).toBeVisible();
		expect(screen.getByTestId(SELECTORS.virtualizedNodeListItem)).toHaveAttribute('id', node.id);
		expect(screen.queryByText(node.name)).not.toBeInTheDocument();
		makeListItemsVisible();
		expect(screen.getByText(node.name)).toBeVisible();
	});
});
