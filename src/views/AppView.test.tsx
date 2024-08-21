/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, fireEvent, waitFor } from '@testing-library/react';
import { EventEmitter } from 'events';
import { graphql, HttpResponse } from 'msw';

import AppView from './AppView';
import { TIMERS } from '../carbonio-files-ui-common/constants';
import {
	DISPLAYER_EMPTY_MESSAGE,
	EMITTER_CODES,
	SELECTORS
} from '../carbonio-files-ui-common/constants/test';
import {
	populateFolder,
	populateNode,
	populateNodePage
} from '../carbonio-files-ui-common/mocks/mockUtils';
import { delayUntil, screen, setup, within } from '../carbonio-files-ui-common/tests/utils';
import {
	GetChildrenDocument,
	GetNodeDocument,
	GetPathDocument,
	GetPermissionsDocument
} from '../carbonio-files-ui-common/types/graphql/types';
import { UPDATE_VIEW_EVENT } from '../constants';
import server from '../mocks/server';

describe('AppView', () => {
	describe('on update view', () => {
		it('should show new child ', async () => {
			const folder = populateFolder();
			const node1 = populateNode();
			const node2 = populateNode();
			folder.children = populateNodePage([node1]);
			const folderUpdated = { ...folder, children: populateNodePage([node1, node2]) };
			server.use(
				graphql.query(
					GetChildrenDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPermissionsDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPathDocument,
					() =>
						HttpResponse.json({
							data: {
								getPath: [folder]
							}
						}),
					{ once: true }
				),
				graphql.query(GetChildrenDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPermissionsDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPathDocument, () =>
					HttpResponse.json({
						data: {
							getPath: [folderUpdated]
						}
					})
				)
			);

			setup(<AppView />, {
				initialRouterEntries: [`/?folder=${folder.id}`]
			});
			await screen.findByTestId(SELECTORS.listHeader);
			await screen.findByTestId(SELECTORS.displayer);
			await screen.findByText(node1.name);
			await screen.findByText(folder.name);
			fireEvent(window, new CustomEvent(UPDATE_VIEW_EVENT));
			await act(async () => {
				// run network queries
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(await screen.findByText(node2.name)).toBeVisible();
		});

		it('should hide removed child', async () => {
			const folder = populateFolder();
			const node1 = populateNode();
			const node2 = populateNode();
			folder.children = populateNodePage([node1, node2]);
			const folderUpdated = { ...folder, children: populateNodePage([node1]) };
			server.use(
				graphql.query(
					GetChildrenDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPermissionsDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPathDocument,
					() =>
						HttpResponse.json({
							data: {
								getPath: [folder]
							}
						}),
					{ once: true }
				),
				graphql.query(GetChildrenDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPermissionsDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPathDocument, () =>
					HttpResponse.json({
						data: {
							getPath: [folderUpdated]
						}
					})
				)
			);

			setup(<AppView />, { initialRouterEntries: [`/?folder=${folder.id}`] });
			await screen.findByTestId(SELECTORS.listHeader);
			await screen.findByTestId(SELECTORS.displayer);
			await screen.findByText(node1.name);
			await screen.findByText(folder.name);
			fireEvent(window, new CustomEvent(UPDATE_VIEW_EVENT));
			await act(async () => {
				// run network queries
				await jest.advanceTimersToNextTimerAsync();
			});
			await waitFor(() => expect(screen.queryByText(node2.name)).not.toBeInTheDocument());
		});

		it('should show updated data for child', async () => {
			const folder = populateFolder();
			const node1 = populateNode();
			const node2 = populateNode();
			folder.children = populateNodePage([node1, node2]);
			const node1Updated = { ...node1, name: 'the new name' };
			const folderUpdated = {
				...folder,
				children: populateNodePage([node1Updated, node2])
			};
			server.use(
				graphql.query(
					GetChildrenDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPermissionsDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPathDocument,
					() =>
						HttpResponse.json({
							data: {
								getPath: [folder]
							}
						}),
					{ once: true }
				),
				graphql.query(GetChildrenDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPermissionsDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPathDocument, () =>
					HttpResponse.json({
						data: {
							getPath: [folderUpdated]
						}
					})
				)
			);
			setup(<AppView />, { initialRouterEntries: [`/?folder=${folder.id}`] });
			await screen.findByTestId(SELECTORS.listHeader);
			await screen.findByTestId(SELECTORS.displayer);
			await screen.findByText(node1.name);
			await screen.findByText(folder.name);
			fireEvent(window, new CustomEvent(UPDATE_VIEW_EVENT));
			await act(async () => {
				// run network queries
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(await screen.findByText(node1Updated.name)).toBeVisible();
			expect(screen.queryByText(node1.name)).not.toBeInTheDocument();
		});

		it('should show updated data inside displayer', async () => {
			const folder = populateFolder();
			const node1 = populateNode();
			folder.children = populateNodePage([node1]);
			const node1Updated = { ...node1, name: 'the new name' };
			const folderUpdated = {
				...folder,
				children: populateNodePage([node1Updated])
			};
			server.use(
				graphql.query(
					GetChildrenDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPermissionsDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetPathDocument,
					() =>
						HttpResponse.json({
							data: {
								getPath: [folder]
							}
						}),
					{ once: true }
				),
				graphql.query(
					GetNodeDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: node1
							}
						}),
					{ once: true }
				),
				graphql.query(GetChildrenDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPermissionsDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folderUpdated
						}
					})
				),
				graphql.query(GetPathDocument, () =>
					HttpResponse.json({
						data: {
							getPath: [folderUpdated]
						}
					})
				),
				graphql.query(GetNodeDocument, () =>
					HttpResponse.json({
						data: {
							getNode: node1Updated
						}
					})
				)
			);
			setup(<AppView />, {
				initialRouterEntries: [`/?folder=${folder.id}&node=${node1.id}`]
			});
			await screen.findByTestId(SELECTORS.listHeader);
			await screen.findByTestId(SELECTORS.displayer);
			await screen.findAllByText(node1.name);
			await screen.findAllByText(folder.name);
			await screen.findByText(/details/i);
			fireEvent(window, new CustomEvent(UPDATE_VIEW_EVENT));
			await act(async () => {
				// run network queries
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(
				await within(screen.getByTestId(SELECTORS.displayerHeader)).findByText(node1Updated.name)
			).toBeVisible();
		});

		it('should not close displayer while retrieving new data', async () => {
			const folder = populateFolder();
			const node1 = populateNode();
			folder.children = populateNodePage([node1]);
			const emitter = new EventEmitter();
			server.use(
				graphql.query(
					GetChildrenDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: folder
							}
						}),
					{ once: true }
				),
				graphql.query(GetChildrenDocument, async () => {
					await delayUntil(emitter, EMITTER_CODES.never);
					return HttpResponse.json({
						data: {
							getNode: folder
						}
					});
				}),
				graphql.query(GetPermissionsDocument, () =>
					HttpResponse.json({
						data: {
							getNode: folder
						}
					})
				),
				graphql.query(GetPathDocument, () =>
					HttpResponse.json({
						data: {
							getPath: [folder]
						}
					})
				),
				graphql.query(
					GetNodeDocument,
					() =>
						HttpResponse.json({
							data: {
								getNode: node1
							}
						}),
					{ once: true }
				),
				graphql.query(GetNodeDocument, async () => {
					await delayUntil(emitter, EMITTER_CODES.never);
					return HttpResponse.json({
						data: {
							getNode: node1
						}
					});
				})
			);
			setup(<AppView />, {
				initialRouterEntries: [`/?folder=${folder.id}&node=${node1.id}`]
			});
			await act(async () => {
				// run network queries
				await jest.advanceTimersToNextTimerAsync();
			});
			fireEvent(window, new CustomEvent(UPDATE_VIEW_EVENT));
			await act(async () => {
				// run network queries
				await jest.advanceTimersToNextTimerAsync();
			});
			act(() => {
				jest.advanceTimersByTime(TIMERS.DISPLAYER_SHOW_MESSAGE);
			});
			expect(screen.queryByText(DISPLAYER_EMPTY_MESSAGE)).not.toBeInTheDocument();
			act(() => {
				emitter.emit(EMITTER_CODES.never);
			});
		});
	});
});
