/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';

import { List } from './List';
import server from '../../../mocks/server';
import { ERROR_CODE } from '../../constants';
import { ACTION_REGEXP, SELECTORS } from '../../constants/test';
import { populateFile, populateLocalRoot, populateNodePage } from '../../mocks/mockUtils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import {
	CopyNodesDocument,
	CopyNodesMutation,
	CopyNodesMutationVariables
} from '../../types/graphql/types';
import { mockErrorResolver, mockGetNode, mockGetPath } from '../../utils/resolverMocks';
import { generateError, screen, setup, within } from '../../utils/testUtils';

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
						generateError(
							'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again',
							ERROR_CODE.overQuotaReached
						)
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
			const snackbar = await screen.findByTestId('snackbar');
			expect(
				within(snackbar).getByText(
					'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again'
				)
			).toBeVisible();
		});

		it('should render the snackbar for the first error if there are multiple error codes', async () => {
			const localRoot = populateLocalRoot();
			const node = populateFile();
			node.parent = localRoot;
			localRoot.children = populateNodePage([node]);
			server.use(
				graphql.mutation<CopyNodesMutation, CopyNodesMutationVariables>(CopyNodesDocument, () =>
					HttpResponse.json({
						errors: [
							generateError('Error! Copy permissions failed', ERROR_CODE.nodeWriteError),
							generateError('Error! Copy action failed', ERROR_CODE.overQuotaReached)
						]
					})
				)
			);
			const { user } = setup(<List nodes={[node]} mainList emptyListMessage={'Empty list'} />, {});
			await user.rightClick(screen.getByText(node.name));
			await screen.findByTestId(SELECTORS.dropdownList);
			await user.click(screen.getByText(ACTION_REGEXP.copy));
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			await user.click(screen.getByRole('button', { name: /copy/i }));
			const snackbar = await screen.findByTestId('snackbar');
			expect(within(snackbar).getByText(/Error! Copy permissions failed/i)).toBeVisible();
			expect(screen.queryByText(/Error! Copy action failed/i)).not.toBeInTheDocument();
		});
	});
});
