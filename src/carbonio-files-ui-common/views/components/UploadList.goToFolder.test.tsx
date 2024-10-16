/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { keyBy } from 'lodash';
import { useLocation } from 'react-router-dom';

import { UploadList } from './UploadList';
import { uploadVar } from '../../apollo/uploadVar';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateLocalRoot, populateUploadItems } from '../../mocks/mockUtils';
import { selectNodes, setup, screen } from '../../tests/utils';
import { UploadStatus } from '../../types/graphql/client-types';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockGetNode } from '../../utils/resolverMocks';

describe('Upload List', () => {
	describe('Go To Folder', () => {
		describe('Selection Mode', () => {
			test('Action is visible if selected items have all the same parent, independently from the status', async () => {
				const localRoot = populateLocalRoot();
				const statuses = Object.values(UploadStatus);
				const uploadItems = populateUploadItems(statuses.length);
				statuses.forEach((status, index) => {
					uploadItems[index].status = status;
					uploadItems[index].parentNodeId = localRoot.id;
				});

				const uploadMap = keyBy(uploadItems, (item) => item.id);

				uploadVar(uploadMap);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<UploadList />, { mocks });

				await selectNodes(Object.keys(uploadMap), user);
				await screen.findByText(/deselect all/i);
				expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })).toBeVisible();
				expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })).toBeEnabled();
			});

			test('Action is hidden if selected at least one of the selected items has a different parent', async () => {
				const localRoot = populateLocalRoot();
				const statuses = Object.values(UploadStatus);
				const uploadItems = populateUploadItems(statuses.length);
				statuses.forEach((status, index) => {
					uploadItems[index].status = status;
					uploadItems[index].parentNodeId = localRoot.id;
				});
				const differentParent = populateFolder();
				uploadItems[uploadItems.length - 1].parentNodeId = differentParent.id;

				const uploadMap = keyBy(uploadItems, (item) => item.id);

				uploadVar(uploadMap);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot, differentParent] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<UploadList />, { mocks });

				await selectNodes(Object.keys(uploadMap), user);
				await screen.findByText(/deselect all/i);
				expect(
					screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })
				).not.toBeInTheDocument();
			});

			test('Action call navigation and exit from selection mode', async () => {
				const localRoot = populateLocalRoot();
				const uploadItems = populateUploadItems(2);
				uploadItems.forEach((item) => {
					item.parentNodeId = localRoot.id;
				});

				const uploadMap = keyBy(uploadItems, (item) => item.id);

				uploadVar(uploadMap);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const TestComponent = (): React.JSX.Element => {
					const location = useLocation();
					return (
						<>
							<div>
								Current location: {location.pathname}
								{location.search}
							</div>
							<UploadList />
						</>
					);
				};
				const { user } = setup(<TestComponent />, {
					mocks
				});

				expect(
					screen.queryByText(`current location: /?folder=${localRoot.id}`, { exact: false })
				).not.toBeInTheDocument();
				await selectNodes(Object.keys(uploadMap), user);
				await screen.findByText(/deselect all/i);
				await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder }));
				await screen.findByText(`current location: /?folder=${localRoot.id}`, { exact: false });
				expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
				expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
			});
		});
	});
});
