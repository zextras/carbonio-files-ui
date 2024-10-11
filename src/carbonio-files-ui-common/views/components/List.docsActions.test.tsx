/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { intersection } from 'lodash';
import { http, HttpResponse } from 'msw';

import { EmptySpaceFiller } from './EmptySpaceFiller';
import { List } from './List';
import server from '../../../mocks/server';
import {
	DOCS_SERVICE_NAME,
	HEALTH_PATH,
	PREVIEW_SERVICE_NAME,
	REST_ENDPOINT
} from '../../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { healthCache } from '../../hooks/useHealthInfo';
import { HealthResponse } from '../../mocks/handleHealthRequest';
import { populateFile, populateFolder, populateNodePage } from '../../mocks/mockUtils';
import { screen, selectNodes, setup } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { File, Folder, GetChildrenParentDocument, NodeType, User } from '../../types/graphql/types';
import {
	MIME_TYPE_PREVIEW_SUPPORT,
	PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS
} from '../../utils/previewUtils';
import { mockGetPath } from '../../utils/resolverMocks';
import { docsHandledMimeTypes } from '../../utils/utils';

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

jest.mock<typeof import('./VirtualizedNodeListItem')>('./VirtualizedNodeListItem');

describe('List', () => {
	describe('docs actions', () => {
		describe('selection mode', () => {
			it.each([
				['edit', ACTION_REGEXP.editDocument, true],
				['open document', ACTION_REGEXP.openDocument, false]
			])('should show %s action if docs is available', async (_, action, writePermission) => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
					)
				);
				const currentFolder = populateFolder(0);
				currentFolder.permissions.can_write_file = true;
				currentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = writePermission;
				node.parent = currentFolder;
				node.owner = currentFolder.owner as User;
				node.type = NodeType.Text;
				[node.mime_type] = docsHandledMimeTypes;
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
						nodes={currentFolder.children.nodes as (File | Folder)[]}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				await screen.findByTextWithMarkup(currentFolder.name);
				await selectNodes([node.id], user);
				await user.rightClick(screen.getByText(node.name));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(action)).toBeVisible();
			});

			it.each([
				['edit', ACTION_REGEXP.editDocument, true],
				['open document', ACTION_REGEXP.openDocument, false]
			])(
				'should not show %s action if docs is not available',
				async (_, action, writePermission) => {
					healthCache.reset();
					server.use(
						http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
							HttpResponse.json({
								dependencies: [{ name: DOCS_SERVICE_NAME, live: false }]
							})
						)
					);
					const currentFolder = populateFolder(0);
					currentFolder.permissions.can_write_file = true;
					currentFolder.permissions.can_write_folder = true;
					const node = populateFile();
					node.permissions.can_write_file = writePermission;
					node.parent = currentFolder;
					node.owner = currentFolder.owner as User;
					node.type = NodeType.Text;
					[node.mime_type] = docsHandledMimeTypes;
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
							nodes={currentFolder.children.nodes as (File | Folder)[]}
							mainList
							emptyListMessage={'hint'}
						/>,
						{ mocks }
					);

					await screen.findByTextWithMarkup(currentFolder.name);
					await selectNodes([node.id], user);
					await user.rightClick(screen.getByText(node.name));
					await screen.findByTestId(SELECTORS.dropdownList);
					expect(screen.queryByText(action)).not.toBeInTheDocument();
				}
			);
		});

		describe('contextual menu', () => {
			it.each(PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS)(
				'should not show preview action if docs is not available for %s mime type',
				async (mimeType) => {
					healthCache.reset();
					server.use(
						http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
							HttpResponse.json({
								dependencies: [
									{ name: DOCS_SERVICE_NAME, live: false },
									{ name: PREVIEW_SERVICE_NAME, live: true }
								]
							})
						)
					);
					const currentFolder = populateFolder(0);
					currentFolder.permissions.can_write_file = true;
					currentFolder.permissions.can_write_folder = true;
					const node = populateFile();
					node.parent = currentFolder;
					node.owner = currentFolder.owner as User;
					node.type = NodeType.Text;
					node.mime_type = mimeType;
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
							nodes={currentFolder.children.nodes as (File | Folder)[]}
							mainList
							emptyListMessage={'hint'}
						/>,
						{ mocks }
					);

					await screen.findByTextWithMarkup(currentFolder.name);
					await user.rightClick(screen.getByText(node.name));
					await screen.findByTestId(SELECTORS.dropdownList);
					expect(screen.queryByText(ACTION_REGEXP.preview)).not.toBeInTheDocument();
				}
			);

			it.each([
				['edit', ACTION_REGEXP.editDocument, true],
				['open document', ACTION_REGEXP.openDocument, false]
			])('should show %s action if docs is available', async (_, action, writePermission) => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
					)
				);
				const currentFolder = populateFolder(0);
				currentFolder.permissions.can_write_file = true;
				currentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = writePermission;
				node.parent = currentFolder;
				node.owner = currentFolder.owner as User;
				node.type = NodeType.Text;
				[node.mime_type] = docsHandledMimeTypes;
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
						nodes={currentFolder.children.nodes as (File | Folder)[]}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				await screen.findByTextWithMarkup(currentFolder.name);
				await user.rightClick(screen.getByText(node.name));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(action)).toBeVisible();
			});

			it.each([
				['edit', ACTION_REGEXP.editDocument, true],
				['open document', ACTION_REGEXP.openDocument, false]
			])(
				'should not show %s action if docs is not available',
				async (_, action, writePermission) => {
					healthCache.reset();
					server.use(
						http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
							HttpResponse.json({
								dependencies: [{ name: DOCS_SERVICE_NAME, live: false }]
							})
						)
					);
					const currentFolder = populateFolder(0);
					currentFolder.permissions.can_write_file = true;
					currentFolder.permissions.can_write_folder = true;
					const node = populateFile();
					node.permissions.can_write_file = writePermission;
					node.parent = currentFolder;
					node.owner = currentFolder.owner as User;
					node.type = NodeType.Text;
					[node.mime_type] = docsHandledMimeTypes;
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
							nodes={currentFolder.children.nodes as (File | Folder)[]}
							mainList
							emptyListMessage={'hint'}
						/>,
						{ mocks }
					);

					await screen.findByTextWithMarkup(currentFolder.name);
					await user.rightClick(screen.getByText(node.name));
					await screen.findByTestId(SELECTORS.dropdownList);
					expect(screen.queryByText(action)).not.toBeInTheDocument();
				}
			);
		});

		describe('within preview', () => {
			const mimeTypesWithPreviewSupport = Object.keys(MIME_TYPE_PREVIEW_SUPPORT).filter(
				(mimeType) => MIME_TYPE_PREVIEW_SUPPORT[mimeType].preview
			);
			it.each(intersection(docsHandledMimeTypes, mimeTypesWithPreviewSupport))(
				'should show edit document action inside preview only if node has write permission (%s)',
				async (mimeType) => {
					const file = populateFile();
					file.mime_type = mimeType;
					file.type = NodeType.Text;
					file.permissions.can_write_file = true;

					const { user } = setup(<List nodes={[file]} mainList emptyListMessage="empty list" />);

					await screen.findByText(file.name);
					await user.rightClick(screen.getByText(file.name));
					expect(await screen.findByText(ACTION_REGEXP.preview)).toBeVisible();
					await user.click(screen.getByText(ACTION_REGEXP.preview));
					expect(screen.getByTestId(ICON_REGEXP.edit)).toBeVisible();
					expect(screen.queryByTestId(ICON_REGEXP.openDocument)).not.toBeInTheDocument();
				}
			);

			it.each(intersection(docsHandledMimeTypes, mimeTypesWithPreviewSupport))(
				'should show open document action if node has not write permissions (%s)',
				async (mimeType) => {
					const file = populateFile();
					file.mime_type = mimeType;
					file.type = NodeType.Text;
					file.permissions.can_write_file = false;

					const { user } = setup(<List nodes={[file]} mainList emptyListMessage="empty list" />);

					await screen.findByText(file.name);
					await user.rightClick(screen.getByText(file.name));
					expect(await screen.findByText(ACTION_REGEXP.preview)).toBeVisible();
					await user.click(screen.getByText(ACTION_REGEXP.preview));
					expect(screen.getByTestId(ICON_REGEXP.openDocument)).toBeVisible();
					expect(screen.queryByTestId(ICON_REGEXP.edit)).not.toBeInTheDocument();
				}
			);

			it.each([
				['edit', ICON_REGEXP.edit, true],
				['open document', ICON_REGEXP.openDocument, false]
			])('should show %s action if docs is available', async (_, actionIcon, writePermission) => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({
							dependencies: [
								{ name: DOCS_SERVICE_NAME, live: true },
								{ name: PREVIEW_SERVICE_NAME, live: true }
							]
						})
					)
				);
				const currentFolder = populateFolder(0);
				currentFolder.permissions.can_write_file = true;
				currentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = writePermission;
				node.parent = currentFolder;
				node.owner = currentFolder.owner as User;
				node.type = NodeType.Text;
				node.mime_type = 'application/msword';
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
						nodes={currentFolder.children.nodes as (File | Folder)[]}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				await screen.findByTextWithMarkup(currentFolder.name);
				await user.rightClick(screen.getByText(node.name));
				await screen.findByTestId(SELECTORS.dropdownList);
				await user.click(screen.getByText(ACTION_REGEXP.preview));
				expect(screen.getByTestId(actionIcon)).toBeVisible();
			});
		});
	});
});
