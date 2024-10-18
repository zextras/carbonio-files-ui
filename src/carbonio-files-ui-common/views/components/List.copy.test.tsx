/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act } from '@testing-library/react';

import { List } from './List';
import { ERROR_CODE } from '../../constants';
import { ACTION_REGEXP, SELECTORS, TIMERS } from '../../constants/test';
import { populateFile, populateLocalRoot, populateNodePage } from '../../mocks/mockUtils';
import { generateError, screen, setup, within } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockErrorResolver, mockGetNode, mockGetPath } from '../../utils/resolverMocks';

jest.mock<typeof import('./VirtualizedNodeListItem')>('./VirtualizedNodeListItem');

describe('Copy', () => {
	describe('Failure for over quota', () => {
		it('should render the snackbar if the copy operation fails', async () => {
			const localRoot = populateLocalRoot();
			const node = populateFile();
			node.parent = localRoot;
			localRoot.children = populateNodePage([node]);
			const mocks = {
				Query: {
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({ getChildren: [localRoot, localRoot] })
				},
				Mutation: {
					copyNodes: mockErrorResolver(
						generateError('Copy error', {
							code: ERROR_CODE.overQuotaReached
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
			await act(async () => {
				// run timers of modal
				await jest.advanceTimersByTimeAsync(TIMERS.modalDelayOpen);
			});
			await user.click(screen.getByRole('button', { name: /copy/i }));
			const snackbar = await screen.findByTestId('snackbar');
			expect(
				within(snackbar).getByText(
					'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again'
				)
			).toBeVisible();
		});
	});
});
