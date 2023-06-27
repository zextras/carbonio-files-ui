/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';

import { List } from './List';
import { populateNodes } from '../../mocks/mockUtils';
import { selectNodes, setup } from '../../utils/testUtils';

describe('List', () => {
	describe('Badge', () => {
		test('should render the list header with the badge with the number of selected items', async () => {
			const nodes = populateNodes(10);
			const { user } = setup(<List nodes={nodes} mainList emptyListMessage={'hint'} />, { mocks: [] );
			const nodesSelected = [nodes[0].id, nodes[1].id];
			// the user selected the first 2 nodes
			await selectNodes(nodesSelected, user);
			expect(screen.getByText(2)).toBeVisible();
			// the user selects 2 more nodes
			await selectNodes([nodes[2].id, nodes[3].id], user);
			expect(screen.getByText(4)).toBeVisible();
		});
		test('if the user clicks SELECT ALL, the badge renders with the length of all nodes, and vice versa', async () => {
			const nodes = populateNodes(10);
			const { user } = setup(<List nodes={nodes} mainList emptyListMessage={'hint'} />);
			// the user selects 1 node
			await selectNodes([nodes[0].id], user);
			expect(screen.getByText(/SELECT ALL/i)).toBeVisible();
			await user.click(screen.getByText(/SELECT ALL/i));
			expect(screen.getByText(nodes.length)).toBeVisible();
			await user.click(screen.getByText(/DESELECT ALL/i));
			expect(screen.queryByText(nodes.length)).not.toBeInTheDocument();
		});
	});
});
