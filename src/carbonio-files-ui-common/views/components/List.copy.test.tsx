/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act } from '@testing-library/react';
import { GraphQLError } from 'graphql/index';

import { List } from './List';
import { ACTION_REGEXP, SELECTORS } from '../../constants/test';
import { populateFile } from '../../mocks/mockUtils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockErrorResolver } from '../../utils/resolverMocks';
import { screen, selectNodes, setup, within } from '../../utils/testUtils';

describe('Copy', () => {
	describe('Failure for over quota', () => {
		it('should render the snackbar if the copy operation fails', async () => {
			const node = populateFile();
			const mocks = {
				Mutation: {
					copyNodes: mockErrorResolver(
						new GraphQLError(`Error! Copy action failed`, {
							extensions: { errorCode: 'OVER_QUOTA_REACHED' }
						})
					)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<List nodes={[node]} mainList emptyListMessage={'Empty list'} />, {
				mocks
			});
			await user.rightClick(screen.getByText(node.name));
			await screen.findByTestId(SELECTORS.dropdownList);
			await user.click(screen.getByText(ACTION_REGEXP.copy));
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			await user.click(screen.getByRole('button', { name: /copy/i }));
			screen.logTestingPlaygroundURL();
			const snackbar = await screen.findByTestId('snackbar');
			expect(within(snackbar).getByText(/Error! Copy action failed./i)).toBeVisible();
		});

		it('should render the snackbar and copy only partial of nodes if the copy operation fails partially', async () => {
			const node1 = populateFile();
			const node2 = populateFile();
			const mocks = {
				Mutation: {
					copyNodes: mockErrorResolver(
						new GraphQLError(`Error! Copy action failed.`, {
							extensions: { errorCode: 'OVER_QUOTA_REACHED' }
						})
					)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<List nodes={[node1, node2]} mainList emptyListMessage={'Empty list'} />,
				{
					mocks
				}
			);
			await selectNodes([node1.id, node2.id], user);
			await user.rightClick(screen.getByText(node1.name));
			await screen.findByTestId(SELECTORS.dropdownList);
			await user.click(screen.getByText(ACTION_REGEXP.copy));
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			await user.click(screen.getByRole('button', { name: /copy/i }));
			expect(await screen.findByText(/Error! Copy action failed./i)).toBeVisible();
			expect(screen.getByText(`${node1.name} (1)`)).toBeVisible();
			// second element is not copied
			expect(screen.queryByText(node2.name)).not.toBeInTheDocument();
		});
	});
});
