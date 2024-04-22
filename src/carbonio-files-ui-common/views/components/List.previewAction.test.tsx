/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { http, HttpResponse } from 'msw';

import { EmptySpaceFiller } from './EmptySpaceFiller';
import { List } from './List';
import server from '../../../mocks/server';
import { HEALTH_PATH, PREVIEW_SERVICE_NAME, REST_ENDPOINT } from '../../constants';
import { ACTION_REGEXP, SELECTORS } from '../../constants/test';
import { healthCache } from '../../hooks/useHealthInfo';
import { HealthResponse } from '../../mocks/handleHealthRequest';
import { populateFile, populateFolder, populateNodePage } from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { Folder, GetChildrenParentDocument, NodeType, User } from '../../types/graphql/types';
import { mockGetPath } from '../../utils/resolverMocks';
import { screen, selectNodes, setup } from '../../utils/testUtils';

function prepareCache(folder: Folder): void {
	global.apolloClient.writeQuery({
		query: GetChildrenParentDocument,
		variables: {
			node_id: folder.id
		},
		data: {
			getNode: folder
		}
	});
}

describe('List', () => {
	describe('preview action', () => {
		describe('selection mode', () => {
			it('should show preview action if preview is available', async () => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({ dependencies: [{ name: PREVIEW_SERVICE_NAME, live: true }] })
					)
				);
				const currentFolder = populateFolder(0);
				currentFolder.permissions.can_write_file = false;
				currentFolder.permissions.can_write_folder = false;
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.parent = currentFolder;
				node.owner = currentFolder.owner as User;
				node.type = NodeType.Text;
				node.mime_type = 'application/pdf';
				currentFolder.children = populateNodePage([node]);
				prepareCache(currentFolder);
				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={[]} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				await screen.findByTextWithMarkup(currentFolder.name);
				await selectNodes([node.id], user);
				await user.rightClick(screen.getByText(node.name));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.preview)).toBeVisible();
			});

			it('should not show preview action if preview is not available', async () => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({
							dependencies: [{ name: PREVIEW_SERVICE_NAME, live: false }]
						})
					)
				);
				const currentFolder = populateFolder(0);
				currentFolder.permissions.can_write_file = true;
				currentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.parent = currentFolder;
				node.owner = currentFolder.owner as User;
				node.type = NodeType.Text;
				node.mime_type = 'application/pdf';
				currentFolder.children = populateNodePage([node]);
				prepareCache(currentFolder);
				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={[]} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				await screen.findByTextWithMarkup(currentFolder.name);
				await selectNodes([node.id], user);
				await user.rightClick(screen.getByText(node.name));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.queryByText(ACTION_REGEXP.preview)).not.toBeInTheDocument();
			});
		});

		describe('contextual menu', () => {
			it('should show preview action if preview is available', async () => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({ dependencies: [{ name: PREVIEW_SERVICE_NAME, live: true }] })
					)
				);
				const currentFolder = populateFolder(0);
				currentFolder.permissions.can_write_file = true;
				currentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.parent = currentFolder;
				node.owner = currentFolder.owner as User;
				node.type = NodeType.Text;
				node.mime_type = 'application/pdf';
				currentFolder.children = populateNodePage([node]);
				prepareCache(currentFolder);
				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={[]} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				await screen.findByTextWithMarkup(currentFolder.name);
				await user.rightClick(screen.getByText(node.name));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.preview)).toBeVisible();
			});

			it('should not show preview action if preview is not available', async () => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({
							dependencies: [{ name: PREVIEW_SERVICE_NAME, live: false }]
						})
					)
				);
				const currentFolder = populateFolder(0);
				currentFolder.permissions.can_write_file = true;
				currentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.parent = currentFolder;
				node.owner = currentFolder.owner as User;
				node.type = NodeType.Text;
				node.mime_type = 'application/pdf';
				currentFolder.children = populateNodePage([node]);
				prepareCache(currentFolder);
				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={[]} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				await screen.findByTextWithMarkup(currentFolder.name);
				await user.rightClick(screen.getByText(node.name));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.queryByText(ACTION_REGEXP.preview)).not.toBeInTheDocument();
			});
		});
	});
});
