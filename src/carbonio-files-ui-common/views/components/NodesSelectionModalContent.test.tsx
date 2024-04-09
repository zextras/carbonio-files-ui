/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */

import React from 'react';

import 'jest-styled-components';
import { ReactiveVar } from '@apollo/client';
import { act, screen, waitFor, within } from '@testing-library/react';
import { forEach, noop, size } from 'lodash';
import { find as findStyled } from 'styled-components/test-utils';

import { NodesSelectionModalContent } from './NodesSelectionModalContent';
import { HoverContainer } from './StyledComponents';
import { DestinationVar, destinationVar } from '../../apollo/destinationVar';
import { ROOTS } from '../../constants';
import { ICON_REGEXP, COLORS, SELECTORS } from '../../constants/test';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNodePage,
	populateNodes
} from '../../mocks/mockUtils';
import { Node, NodeWithMetadata } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import {
	GetRootsListDocument,
	GetRootsListQuery,
	GetRootsListQueryVariables
} from '../../types/graphql/types';
import {
	mockCreateFolder,
	mockErrorResolver,
	mockFindNodes,
	mockGetNode,
	mockGetPath,
	mockGetRootsList
} from '../../utils/resolverMocks';
import { buildBreadCrumbRegExp, generateError, setup } from '../../utils/testUtils';
import { isFile, isFolder } from '../../utils/utils';

const resetToDefault = ({
	maxSelection,
	canSelectOpenedFolder
}: {
	maxSelection: number | undefined;
	canSelectOpenedFolder: boolean | undefined;
}): void => {
	// clone implementation of the function contained in the click callback of useNodesSelectionModalContent
	const getDestinationVar = destinationVar as ReactiveVar<DestinationVar<NodeWithMetadata[]>>;
	if (maxSelection === 1 || size(getDestinationVar().currentValue) === 0) {
		if (canSelectOpenedFolder) {
			destinationVar({ ...destinationVar(), currentValue: destinationVar().defaultValue });
		} else if (size(getDestinationVar().currentValue) > 0) {
			destinationVar({ currentValue: undefined, defaultValue: undefined });
		}
	}
};

describe('Nodes Selection Modal Content', () => {
	test('title and description are visible if set', async () => {
		const mocks = {
			Query: {
				getRootsList: mockGetRootsList()
			}
		} satisfies Partial<Resolvers>;
		setup(
			<div
				onClick={(): void =>
					resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: undefined })
				}
			>
				<NodesSelectionModalContent
					confirmAction={noop}
					confirmLabel="Confirm label"
					title="This is the title"
					closeAction={noop}
					description="This is the description"
				/>
			</div>,
			{
				mocks
			}
		);

		await screen.findByText(/home/i);
		// wait for root list query to be executed
		await waitFor(() =>
			expect(
				global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
					query: GetRootsListDocument
				})?.getRootsList || null
			).not.toBeNull()
		);
		expect(screen.getByText('This is the title')).toBeVisible();
		expect(screen.getByText('This is the description')).toBeVisible();
		expect(screen.getByText(/confirm label/i)).toBeVisible();
	});

	test('Opened folder is a selectable node by param and by the validity check. Confirm button is enabled on navigation', async () => {
		const localRoot = populateLocalRoot();
		const folder = populateFolder();
		const file = populateFile();
		localRoot.children = populateNodePage([folder, file]);
		folder.parent = localRoot;
		file.parent = localRoot;

		const mocks = {
			Query: {
				getRootsList: mockGetRootsList(),
				getPath: mockGetPath([localRoot]),
				getNode: mockGetNode({
					getChildren: [localRoot],
					getPermissions: [localRoot],
					getBaseNode: [localRoot]
				})
			}
		} satisfies Partial<Resolvers>;

		const isValidSelection = jest.fn().mockReturnValue(() => true);
		const confirmAction = jest.fn();

		const { findByTextWithMarkup, user } = setup(
			<div
				onClick={(): void =>
					resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: true })
				}
			>
				<NodesSelectionModalContent
					confirmAction={confirmAction}
					confirmLabel="Select"
					title="Select nodes"
					closeAction={noop}
					canSelectOpenedFolder
					maxSelection={undefined}
					isValidSelection={isValidSelection}
				/>
			</div>,
			{
				mocks
			}
		);
		await screen.findByText(/home/i);
		// wait for root list query to be executed
		await waitFor(() =>
			expect(
				global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
					query: GetRootsListDocument
				})?.getRootsList || null
			).not.toBeNull()
		);
		// confirm button is disabled
		const confirmButton = screen.getByRole('button', { name: /select/i });
		expect(confirmButton).toBeVisible();
		expect(confirmButton).toBeDisabled();
		await user.dblClick(screen.getByText(/home/i));
		await screen.findByText(folder.name);
		const breadcrumbItem = await findByTextWithMarkup(
			buildBreadCrumbRegExp('Files', localRoot.name)
		);
		expect(breadcrumbItem).toBeVisible();
		expect(screen.getByText(folder.name)).toBeVisible();
		expect(screen.getByText(file.name)).toBeVisible();
		// confirm button becomes enabled because opened folder is valid both by param and by validity check
		await waitFor(() => expect(confirmButton).toBeEnabled());
		expect(isValidSelection).toHaveBeenCalled();
		expect(isValidSelection).toHaveBeenCalledWith(expect.objectContaining({ id: localRoot.id }));
		await user.click(confirmButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenCalledWith([expect.objectContaining({ id: localRoot.id })]);
	});

	test('Opened folder is a selectable node by param and but not by the validity check. Confirm button is disabled on navigation', async () => {
		const localRoot = populateLocalRoot();
		const folder = populateFolder();
		const file = populateFile();
		localRoot.children = populateNodePage([folder, file]);
		folder.parent = localRoot;
		file.parent = localRoot;

		const mocks = {
			Query: {
				getRootsList: mockGetRootsList(),
				getPath: mockGetPath([localRoot]),
				getNode: mockGetNode({
					getChildren: [localRoot],
					getPermissions: [localRoot],
					getBaseNode: [localRoot]
				})
			}
		} satisfies Partial<Resolvers>;

		const isValidSelection = jest
			.fn()
			.mockImplementation(({ id }: { id: string }) => id !== localRoot.id);
		const confirmAction = jest.fn();

		const { findByTextWithMarkup, user } = setup(
			<div
				onClick={(): void =>
					resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: true })
				}
			>
				<NodesSelectionModalContent
					confirmAction={confirmAction}
					confirmLabel="Select"
					title="Select nodes"
					closeAction={noop}
					canSelectOpenedFolder
					maxSelection={undefined}
					isValidSelection={isValidSelection}
				/>
			</div>,
			{
				mocks
			}
		);
		await screen.findByText(/home/i);
		// wait for root list query to be executed
		await waitFor(() =>
			expect(
				global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
					query: GetRootsListDocument
				})?.getRootsList || null
			).not.toBeNull()
		);
		// confirm button is disabled
		const confirmButton = screen.getByRole('button', { name: /select/i });
		expect(confirmButton).toBeVisible();
		expect(confirmButton).toBeDisabled();
		await user.dblClick(screen.getByText(/home/i));
		await screen.findByText(folder.name);
		const breadcrumbItem = await findByTextWithMarkup(
			buildBreadCrumbRegExp('Files', localRoot.name)
		);
		expect(breadcrumbItem).toBeVisible();
		expect(screen.getByText(folder.name)).toBeVisible();
		expect(screen.getByText(file.name)).toBeVisible();
		// confirm button remains disabled because opened folder is not valid by validity check
		await waitFor(() => expect(confirmButton).toBeDisabled());
		expect(isValidSelection).toHaveBeenCalled();
		expect(isValidSelection).toHaveBeenCalledWith(expect.objectContaining({ id: localRoot.id }));
		await user.click(confirmButton);
		expect(confirmAction).not.toHaveBeenCalled();
	});

	test('Opened folder is not a selectable node by param and but it is by the validity check. Confirm button is disabled on navigation', async () => {
		const localRoot = populateLocalRoot();
		const folder = populateFolder();
		const file = populateFile();
		localRoot.children = populateNodePage([folder, file]);
		folder.parent = localRoot;
		file.parent = localRoot;

		const mocks = {
			Query: {
				getRootsList: mockGetRootsList(),
				getPath: mockGetPath([localRoot]),
				getNode: mockGetNode({
					getChildren: [localRoot],
					getPermissions: [localRoot],
					getBaseNode: [localRoot]
				})
			}
		} satisfies Partial<Resolvers>;

		const isValidSelection = jest.fn().mockReturnValue(true);
		const confirmAction = jest.fn();

		const { findByTextWithMarkup, user } = setup(
			<div
				onClick={(): void =>
					resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
				}
			>
				<NodesSelectionModalContent
					confirmAction={confirmAction}
					confirmLabel="Select"
					title="Select nodes"
					closeAction={noop}
					canSelectOpenedFolder={false}
					maxSelection={undefined}
					isValidSelection={isValidSelection}
				/>
			</div>,
			{
				mocks
			}
		);
		await screen.findByText(/home/i);
		// wait for root list query to be executed
		await waitFor(() =>
			expect(
				global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
					query: GetRootsListDocument
				})?.getRootsList || null
			).not.toBeNull()
		);
		// confirm button is disabled
		const confirmButton = screen.getByRole('button', { name: /select/i });
		expect(confirmButton).toBeVisible();
		expect(confirmButton).toBeDisabled();
		// reset number of calls
		isValidSelection.mockReset();
		await user.dblClick(screen.getByText(/home/i));
		await screen.findByText(folder.name);
		const breadcrumbItem = await findByTextWithMarkup(
			buildBreadCrumbRegExp('Files', localRoot.name)
		);
		expect(breadcrumbItem).toBeVisible();
		expect(screen.getByText(folder.name)).toBeVisible();
		expect(screen.getByText(file.name)).toBeVisible();
		// wait a tick to allow getBaseNode query to complete
		act(() => {
			jest.runOnlyPendingTimers();
		});
		// confirm button remains disabled because the opened folder is not valid by validity check
		expect(confirmButton).toBeDisabled();
		expect(isValidSelection).not.toHaveBeenCalledWith(
			expect.objectContaining({ id: localRoot.id })
		);
		await user.click(confirmButton);
		expect(confirmAction).not.toHaveBeenCalled();
	});

	test('Non selectable nodes show a tooltip on hover if provided', async () => {
		const mocks = {
			Query: {
				getRootsList: mockGetRootsList()
			}
		} satisfies Partial<Resolvers>;

		const isValidSelection = jest.fn().mockReturnValue(false);

		const { user } = setup(
			<div
				onClick={(): void =>
					resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
				}
			>
				<NodesSelectionModalContent
					confirmAction={noop}
					confirmLabel="Select"
					title="Select nodes"
					closeAction={noop}
					canSelectOpenedFolder={false}
					maxSelection={undefined}
					isValidSelection={isValidSelection}
					disabledTooltip="Node is not selectable"
				/>
			</div>,
			{
				mocks
			}
		);
		await screen.findByText(/home/i);
		// wait for root list query to be executed
		await waitFor(() =>
			expect(
				global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
					query: GetRootsListDocument
				})?.getRootsList || null
			).not.toBeNull()
		);
		expect(screen.getByText(/home/i)).toBeVisible();
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		const nodeAvatarIcons = screen.getAllByTestId(SELECTORS.nodeAvatar);
		expect(nodeAvatarIcons).toHaveLength(2);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(nodeAvatarIcons[0]).not.toHaveAttribute('disabled', '');
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(nodeAvatarIcons[1]).not.toHaveAttribute('disabled', '');
		act(() => {
			// run tooltip timer to register listeners
			jest.runOnlyPendingTimers();
		});
		await user.hover(nodeAvatarIcons[0]);
		const tooltipMsg = 'Node is not selectable';
		await screen.findByText(tooltipMsg);
		expect(screen.getByText(tooltipMsg)).toBeVisible();
		await user.unhover(nodeAvatarIcons[0]);
		expect(screen.queryByText(tooltipMsg)).not.toBeInTheDocument();
		await user.hover(nodeAvatarIcons[1]);
		await screen.findByText(tooltipMsg);
		expect(screen.getByText(tooltipMsg)).toBeVisible();
		await user.unhover(nodeAvatarIcons[1]);
		expect(screen.queryByText(tooltipMsg)).not.toBeInTheDocument();
	});

	describe('Single selection', () => {
		test('number of selected items is not visible', async () => {
			const localRoot = populateLocalRoot();
			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getNode: mockGetNode({ getBaseNode: [localRoot] })
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Confirm"
						title="This is the title"
						closeAction={noop}
						description="This is the description"
						maxSelection={1}
					/>
				</div>,
				{
					mocks
				}
			);

			await screen.findByText(/home/i);
			// wait for root list query to be executed
			await waitFor(() =>
				expect(
					global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
						query: GetRootsListDocument
					})?.getRootsList || null
				).not.toBeNull()
			);
			const confirmButton = screen.getByRole('button', { name: /confirm/i });
			expect(confirmButton).toBeDisabled();
			await user.click(screen.getByText(/home/i));
			await waitFor(() => expect(confirmButton).toBeEnabled());
			expect(screen.queryByText(/element selected/i)).not.toBeInTheDocument();
		});

		describe('without criteria to select nodes', () => {
			test('show roots by default. confirm button is disabled', async () => {
				const confirmAction = jest.fn();
				const mocks = {
					Query: {
						getRootsList: mockGetRootsList()
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);

				await screen.findByText('Select nodes');
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				expect(screen.getByText('Home')).toBeVisible();
				expect(screen.getByText('Shared with me')).toBeVisible();
				expect(screen.queryByText('Trash')).not.toBeInTheDocument();
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
			});

			test('folder node is a valid selection', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
				const confirmButton = screen.getByRole('button', { name: /select/i });
				// click on a folder enable confirm button
				await user.click(screen.getByText(folder.name));
				// confirm button is active
				await waitFor(() => expect(confirmButton).toBeEnabled());
				// click on confirm button
				await user.click(confirmButton);
				await waitFor(() => expect(confirmAction).toHaveBeenCalled());
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							id: folder.id,
							name: folder.name
						})
					])
				);
			});

			test('file node is a valid selection', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
				const confirmButton = screen.getByRole('button', { name: /select/i });
				// click on a file
				await user.click(screen.getByText(file.name));
				// confirm button becomes active
				await waitFor(() => expect(confirmButton).toBeEnabled());
				// click on confirm button
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							id: file.id,
							name: file.name
						})
					])
				);
			});

			test('confirm button is enabled when navigating inside a folder if opened folder is selectable by param', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void => resetToDefault({ maxSelection: 1, canSelectOpenedFolder: true })}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				let confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				const breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name)
				);
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				// all nodes are enabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file.name)).not.toHaveAttribute('disabled', '');
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder.name)).not.toHaveAttribute('disabled', '');
				// confirm button is enabled because navigation set opened folder as selected node
				confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeEnabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([expect.objectContaining({ id: localRoot.id })])
				);
				// confirm leave selection as it is and button remains enabled
				expect(confirmButton).toBeEnabled();
			});

			test('confirm button is disabled when navigating inside a folder if opened folder is not selectable by param', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void => resetToDefault({ maxSelection: 1, canSelectOpenedFolder: false })}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder={false}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				let confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				const breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name)
				);
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				// all nodes are enabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file.name)).not.toHaveAttribute('disabled', '');
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder.name)).not.toHaveAttribute('disabled', '');
				// confirm button is enabled because navigation set opened folder as selected node
				confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
				// confirm leave selection as it is and button remains disabled
				expect(confirmButton).toBeDisabled();
			});

			test('local root item is valid, other roots are not valid', async () => {
				const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT);

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				const breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files'));
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(/home/i)).toBeVisible();
				// confirm button is disabled
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				// click on other root
				await user.click(screen.getByText(/shared with me/i));
				// item is not a valid selection
				expect(confirmButton).toBeDisabled();
				// ugly but it's the only way to check the item is visibly active
				await user.click(screen.getByText(/home/i));
				// confirm button becomes enabled because local root is a valid selection
				await waitFor(() => expect(confirmButton).toBeEnabled());
				// ugly but it's the only way to check the item is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([expect.objectContaining({ id: localRoot.id })])
				);
			});

			test('navigation through breadcrumb reset active folder and set opened folder if is selectable by param', async () => {
				const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT);
				const folder = populateFolder();
				localRoot.children.nodes.push(folder);
				folder.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot], [localRoot, folder]),
						getNode: mockGetNode({
							getChildren: [localRoot, folder],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void => resetToDefault({ maxSelection: 1, canSelectOpenedFolder: true })}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				let breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files'));
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(/home/i)).toBeVisible();
				await user.click(screen.getByText(/home/i));
				// ugly but it's the only way to check the item is visibly active
				await waitFor(() =>
					expect(
						findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
					).toHaveStyle({ background: COLORS.highlight.regular })
				);
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
				breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', folder.parent.name)
				);
				expect(breadcrumbItem).toBeVisible();
				// confirm button is enabled because of navigation
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeEnabled();
				// navigate back to the roots list through breadcrumb
				await user.click(screen.getByText('Files'));
				// wait roots list to be rendered
				await screen.findByText(/home/i);
				expect(screen.queryByText(folder.name)).not.toBeInTheDocument();
				expect(screen.getByText(/home/i)).toBeVisible();
				expect(screen.getByText(/shared with me/i)).toBeVisible();
				// confirm button is disabled because is now referring the entry point, which is not valid
				expect(confirmButton).toBeDisabled();
				// local root item is not visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
				// navigate again inside local root
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
				breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', folder.parent.name)
				);
				expect(breadcrumbItem).toBeVisible();
				// confirm button is disabled
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeEnabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							id: localRoot.id,
							name: localRoot.name
						})
					])
				);
				// select a valid node
				await user.click(screen.getByText(folder.name));
				// confirm button is active because folder is a valid selection
				await waitFor(() => expect(confirmButton).toBeEnabled());
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							id: folder.id,
							name: folder.name
						})
					])
				);
			});

			test('navigation through breadcrumb reset active folder and disable confirm button if opened folder is not selectable by param', async () => {
				const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT);
				const folder = populateFolder();
				localRoot.children.nodes.push(folder);
				folder.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot], [localRoot, folder]),
						getNode: mockGetNode({
							getChildren: [localRoot, folder],
							getPermissions: [localRoot, folder],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				let breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files'));
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(/home/i)).toBeVisible();
				await user.click(screen.getByText(/home/i));
				// ugly but it's the only way to check the item is visibly active
				await waitFor(() =>
					expect(
						findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
					).toHaveStyle({ background: COLORS.highlight.regular })
				);
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
				breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
				expect(breadcrumbItem).toBeVisible();
				// confirm button is disabled because of navigation
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				// navigate inside a sub-folder
				await user.dblClick(screen.getByText(folder.name));
				await screen.findByText(/nothing here/i);
				await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name, folder.name));
				// navigate back to the local root through breadcrumb
				await user.click(screen.getByText(localRoot.name));
				// wait roots list to be rendered
				await screen.findByText(folder.name);
				expect(screen.queryByText(/nothing here/i)).not.toBeInTheDocument();
				expect(screen.getByText(folder.name)).toBeVisible();
				// confirm button is disabled because opened folder is not selectable by param
				expect(confirmButton).toBeDisabled();
				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
				// select a valid node
				await user.click(screen.getByText(folder.name));
				// confirm button is active because folder is a valid selection
				await waitFor(() => expect(confirmButton).toBeEnabled());
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							id: folder.id,
							name: folder.name
						})
					])
				);
			});

			test('shared with me root is navigable', async () => {
				const sharedWithMeFilter = populateNodes(4);

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						findNodes: mockFindNodes(sharedWithMeFilter)
					}
				} satisfies Partial<Resolvers>;

				const { getByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				expect(screen.getByText(/shared with me/i)).toBeVisible();
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				// confirm button is disabled because entry point is not a valid selection
				expect(confirmButton).toBeDisabled();
				await user.click(screen.getByText(/shared with me/i));
				// shared with me item is not a valid selection
				expect(confirmButton).toBeDisabled();
				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
				expect(screen.queryByText(/trash/i)).not.toBeInTheDocument();
				// navigate inside shared with me
				await user.dblClick(screen.getByText(/shared with me/i));
				await screen.findByText(sharedWithMeFilter[0].name);
				expect(screen.getByText(sharedWithMeFilter[0].name)).toBeVisible();
				expect(getByTextWithMarkup(buildBreadCrumbRegExp('Files', 'Shared with me'))).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
			});

			test('confirm action is called with array containing active item after click on shared node', async () => {
				const filter = populateNodes(2);
				const folder = populateFolder(3);
				filter.push(folder);

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						findNodes: mockFindNodes(filter)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={1}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/shared with me/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				await user.dblClick(screen.getByText(/shared with me/i));
				await screen.findByText(folder.name);
				expect(screen.getByText(filter[0].name)).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeDisabled();
				await user.click(screen.getByText(folder.name));
				await waitFor(() => expect(confirmButton).toBeEnabled());
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenLastCalledWith(
					expect.arrayContaining([expect.objectContaining({ id: folder.id, name: folder.name })])
				);
			});
		});

		describe('with criteria to select nodes', () => {
			test('only files are selectable; folders are still navigable but not selectable', async () => {
				const localRoot = populateLocalRoot();
				const file = populateFile();
				const folder = populateFolder(1);
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const isValidSelection = jest
					.fn()
					.mockImplementation((node: Pick<Node, '__typename'>) => isFile(node));
				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<div
						onClick={(): void => resetToDefault({ maxSelection: 1, canSelectOpenedFolder: true })}
					>
						<NodesSelectionModalContent
							title="Only files"
							confirmAction={confirmAction}
							confirmLabel="Confirm"
							closeAction={noop}
							isValidSelection={isValidSelection}
							maxSelection={1}
							canSelectOpenedFolder
						/>
					</div>,
					{ mocks }
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);

				// navigate inside home
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				// folder is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder.name)).not.toHaveAttribute('disabled', '');
				// file is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file.name)).not.toHaveAttribute('disabled', '');
				const confirmButton = screen.getByRole('button', { name: /confirm/i });
				// confirm button is disabled because local root is not a file
				expect(confirmButton).toBeDisabled();
				// click on folder
				await user.click(screen.getByText(folder.name));
				// confirm button remains disabled
				expect(confirmButton).toBeDisabled();
				// click on file
				await user.click(screen.getByText(file.name));
				// confirm button becomes enabled
				await waitFor(() => expect(confirmButton).toBeEnabled());
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith([
					expect.objectContaining({ id: file.id, name: file.name })
				]);
			});

			test('only folders are selectable; folders are navigable and selectable, files are fully disabled', async () => {
				const localRoot = populateLocalRoot();
				const file = populateFile();
				const folder = populateFolder(1);
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const isValidSelection = jest
					.fn()
					.mockImplementation((node: Pick<Node, '__typename'>) => isFolder(node));
				const confirmAction = jest.fn();
				const resetToDefaultFn = jest.fn(resetToDefault);

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { user, findByTextWithMarkup } = setup(
					<div
						onClick={(): void =>
							resetToDefaultFn({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							title="Only folders"
							confirmAction={confirmAction}
							confirmLabel="Confirm"
							closeAction={noop}
							isValidSelection={isValidSelection}
							maxSelection={1}
						/>
					</div>,
					{ mocks }
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);

				// navigate inside home
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				// folder is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder.name)).not.toHaveAttribute('disabled', '');
				// file is disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file.name)).toHaveAttribute('disabled', '');
				const confirmButton = screen.getByRole('button', { name: /confirm/i });
				// confirm button is disabled because local root is not selectable by param
				expect(confirmButton).toBeDisabled();
				// reset calls
				resetToDefaultFn.mockClear();
				// click on folder
				await user.click(screen.getByText(folder.name));
				// confirm button becomes enabled
				expect(confirmButton).toBeEnabled();
				// click on file
				await user.click(screen.getByText(file.name));
				expect(resetToDefaultFn).toHaveBeenCalledTimes(1);
				// confirm button becomes disabled
				expect(confirmButton).toBeDisabled();
				// click again on folder
				await user.click(screen.getByText(folder.name));
				// confirm button becomes enabled
				expect(confirmButton).toBeEnabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith([
					expect.objectContaining({ id: folder.id, name: folder.name })
				]);
			});

			test('custom validity check set nodes that are not a valid selection as disabled. Folders remain navigable, files are fully disabled', async () => {
				const localRoot = populateLocalRoot();
				const validFile = populateFile(undefined, 'valid file');
				const validFolder = populateFolder(1, undefined, 'valid folder');
				const invalidFile = populateFile(undefined, 'not valid file');
				const invalidFolder = populateFolder(0, undefined, 'not valid folder');
				localRoot.children.nodes.push(validFile, validFolder, invalidFile, invalidFolder);
				validFolder.parent = localRoot;
				validFile.parent = localRoot;
				invalidFolder.parent = localRoot;
				invalidFile.parent = localRoot;

				const isValidSelection = jest
					.fn()
					.mockImplementation((node: Pick<Node, 'name'>) => node.name.startsWith('valid'));
				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot], [localRoot, invalidFolder]),
						getNode: mockGetNode({
							getChildren: [localRoot, invalidFolder],
							getPermissions: [localRoot, invalidFolder],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: 1, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							title="Custom selector"
							confirmAction={confirmAction}
							confirmLabel="Confirm"
							closeAction={noop}
							isValidSelection={isValidSelection}
							maxSelection={1}
						/>
					</div>,
					{ mocks }
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);

				// navigate inside home
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(validFolder.name);
				expect(screen.getByText(validFolder.name)).toBeVisible();
				expect(screen.getByText(validFile.name)).toBeVisible();
				expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
				// valid folder is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(validFolder.name)).not.toHaveAttribute('disabled', '');
				// valid file is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(validFile.name)).not.toHaveAttribute('disabled', '');
				// invalid file is disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(invalidFile.name)).toHaveAttribute('disabled', '');
				// invalid folder is not disabled because is navigable
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(invalidFolder.name)).not.toHaveAttribute('disabled', '');
				const confirmButton = screen.getByRole('button', { name: /confirm/i });
				// confirm button is disabled because local root is not selectable by param
				expect(confirmButton).toBeDisabled();
				// click on valid folder
				await user.click(screen.getByText(validFolder.name));
				// confirm button becomes enabled
				expect(confirmButton).toBeEnabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledTimes(1);
				expect(confirmAction).toHaveBeenCalledWith([
					expect.objectContaining({ id: validFolder.id, name: validFolder.name })
				]);
				// click on invalid folder
				await user.click(screen.getByText(invalidFolder.name));
				// confirm button becomes disabled
				expect(confirmButton).toBeDisabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledTimes(1);
				// click on valid file
				await user.click(screen.getByText(validFile.name));
				// confirm button becomes enabled
				expect(confirmButton).toBeEnabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledTimes(2);
				expect(confirmAction).toHaveBeenLastCalledWith([
					expect.objectContaining({ id: validFile.id, name: validFile.name })
				]);
				// click on invalid file
				await user.click(screen.getByText(invalidFile.name));
				// confirm button remains disabled
				expect(confirmButton).toBeDisabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledTimes(2);
				// navigation inside invalid folder is enabled
				await user.dblClick(screen.getByText(invalidFolder.name));
				await screen.findByText(/nothing here/i);
				await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name, invalidFolder.name)
				);
				expect(screen.queryByText(validFolder.name)).not.toBeInTheDocument();
				expect(screen.queryByText(validFile.name)).not.toBeInTheDocument();
				expect(screen.queryByText(invalidFile.name)).not.toBeInTheDocument();
				expect(confirmButton).toBeDisabled();
			});
		});
	});

	describe('Multiple selection', () => {
		test('number of selected items is visible', async () => {
			const localRoot = populateLocalRoot();
			const file = populateFile();
			const folder = populateFolder();
			localRoot.children = populateNodePage([file, folder]);
			file.parent = localRoot;
			folder.parent = localRoot;

			const confirmAction = jest.fn();

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot]
					})
				}
			} satisfies Partial<Resolvers>;

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: undefined })
					}
				>
					<NodesSelectionModalContent
						confirmAction={confirmAction}
						confirmLabel="Select"
						title="Multiple selection"
						closeAction={noop}
						maxSelection={undefined}
					/>
				</div>,
				{
					mocks
				}
			);

			await screen.findByText(/home/i);
			// wait for root list query to be executed
			await waitFor(() =>
				expect(
					global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
						query: GetRootsListDocument
					})?.getRootsList || null
				).not.toBeNull()
			);
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			expect(screen.getByText(folder.name)).toBeVisible();
			expect(screen.getByText(file.name)).toBeVisible();
			const confirmButton = screen.getByRole('button', { name: /select/i });
			expect(confirmButton).toBeDisabled();
			// number of selected items is hidden
			expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();
			// select a node
			await user.click(screen.getByText(folder.name));
			// confirm button becomes enabled
			await waitFor(() => expect(confirmButton).toBeEnabled());
			// number of selected items becomes visible
			expect(screen.getByText(/1 element selected/i)).toBeVisible();
			// select a second node
			await user.click(screen.getByText(file.name));
			// confirm button is still enabled
			expect(confirmButton).toBeEnabled();
			// number of selected items is updated
			expect(screen.getByText(/2 elements selected/i)).toBeVisible();
		});

		test('if a max number of nodes is selectable, when limit is overreached confirm button becomes disabled', async () => {
			const localRoot = populateLocalRoot();
			const nodes = populateNodes(5);
			localRoot.children = populateNodePage([...nodes]);
			forEach(nodes, (mockedNode) => {
				mockedNode.parent = localRoot;
			});

			const confirmAction = jest.fn();

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot]
					})
				}
			} satisfies Partial<Resolvers>;

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: 3, canSelectOpenedFolder: undefined })
					}
				>
					<NodesSelectionModalContent
						confirmAction={confirmAction}
						confirmLabel="Select"
						title="Multiple selection"
						closeAction={noop}
						maxSelection={3}
					/>
				</div>,
				{
					mocks
				}
			);

			await screen.findByText(/home/i);
			// wait for root list query to be executed
			await waitFor(() =>
				expect(
					global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
						query: GetRootsListDocument
					})?.getRootsList || null
				).not.toBeNull()
			);
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(nodes[0].name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			expect(screen.getByText(nodes[0].name)).toBeVisible();
			const confirmButton = screen.getByRole('button', { name: /select/i });
			expect(confirmButton).toBeDisabled();
			// number of selected items is hidden
			expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();
			// select a node
			await user.click(screen.getByText(nodes[0].name));
			// confirm button becomes enabled
			await waitFor(() => expect(confirmButton).toBeEnabled());
			// number of selected items becomes visible
			expect(screen.getByText(/1 element selected/i)).toBeVisible();
			// select a second node
			await user.click(screen.getByText(nodes[1].name));
			// select a third node
			await user.click(screen.getByText(nodes[2].name));
			// confirm button is still enabled
			expect(confirmButton).toBeEnabled();
			// number of selected items is updated
			expect(screen.getByText(/3 elements selected/i)).toBeVisible();
			// try to click a fourth node
			await user.click(screen.getByText(nodes[3].name));
			// number of selected items is updated
			expect(screen.getByText(/4 elements selected/i)).toBeVisible();
			// confirm button becomes disabled
			expect(confirmButton).toBeDisabled();
		});

		describe('without criteria to select nodes', () => {
			test('folder node is a valid selection', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				act(() => {
					jest.runOnlyPendingTimers();
				});
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
				const confirmButton = screen.getByRole('button', { name: /select/i });
				// click on a folder enable confirm button
				await user.click(screen.getByText(folder.name));
				// confirm button is active
				await waitFor(() => expect(confirmButton).toBeEnabled());
				// click on confirm button
				await user.click(confirmButton);
				await waitFor(() => expect(confirmAction).toHaveBeenCalled());
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							id: folder.id,
							name: folder.name
						})
					])
				);
			});

			test('file node is a valid selection', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
				const confirmButton = screen.getByRole('button', { name: /select/i });
				// click on a file
				await user.click(screen.getByText(file.name));
				// confirm button becomes active
				await waitFor(() => expect(confirmButton).toBeEnabled());
				// click on confirm button
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							id: file.id,
							name: file.name
						})
					])
				);
			});

			test('confirm button is enabled when navigating inside a folder if opened folder is selectable by param', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: true })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				let confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				const breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name)
				);
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				// all nodes are enabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file.name)).not.toHaveAttribute('disabled', '');
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder.name)).not.toHaveAttribute('disabled', '');
				// confirm button is enabled because navigation set opened folder as selected node
				confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeEnabled();
				// number of element selected is visible
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith(
					expect.arrayContaining([expect.objectContaining({ id: localRoot.id })])
				);
			});

			test('confirm button is disabled when navigating inside a folder if opened folder is not selectable by param', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder={false}
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				let confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				const breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name)
				);
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				// all nodes are enabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file.name)).not.toHaveAttribute('disabled', '');
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder.name)).not.toHaveAttribute('disabled', '');
				// confirm button is enabled because navigation set opened folder as selected node
				confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();
				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
				// confirm leave selection as it is and button remains disabled
				expect(confirmButton).toBeDisabled();
			});

			test('Single click on a valid unselected node set the node as selected', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder={false}
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				const breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name)
				);
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				await user.click(screen.getByText(folder.name));
				// ugly but it's the only way to check the item is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledWith([expect.objectContaining({ id: folder.id })]);
				// ugly but it's the only way to check the item is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });

				await user.click(screen.getByText(file.name));
				// both nodes are visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file.id)), HoverContainer)
				).toHaveStyle({
					background: COLORS.highlight.regular
				});
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(screen.getByText(/2 elements selected/i)).toBeVisible();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledWith([
					expect.objectContaining({ id: folder.id }),
					expect.objectContaining({ id: file.id })
				]);
			});

			test('With more then one node selected, single click on a selected node set the node as unselected. Other nodes remain selected', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder={false}
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				const breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name)
				);
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });

				await user.click(screen.getByText(folder.name));

				await user.click(screen.getByText(file.name));
				// both nodes are visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file.id)), HoverContainer)
				).toHaveStyle({
					background: COLORS.highlight.regular
				});
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(screen.getByText(/2 elements selected/i)).toBeVisible();
				// click again on folder item to deselect it

				await user.click(screen.getByText(folder.name));
				// file remains visibly active, folder returns normal
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file.id)), HoverContainer)
				).toHaveStyle({
					background: COLORS.highlight.regular
				});
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledWith([expect.objectContaining({ id: file.id })]);
			});

			test('With only one node selected and opened folder as invalid selection, single click on selected node set the node as unselected and confirm button as disabled', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder={false}
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				const breadcrumbItem = await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name)
				);
				expect(breadcrumbItem).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });

				await user.click(screen.getByText(folder.name));
				// ugly but it's the only way to check the item is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// click again on folder item to deselect it

				await user.click(screen.getByText(folder.name));
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// confirm button becomes disabled since opened folder is not valid
				expect(confirmButton).toBeDisabled();
				expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();

				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
			});

			test('With only one node selected and opened folder as valid selection, single click on selected node set the node as unselected and opened folder as selected. Confirm button is then enabled', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				const file = populateFile();
				localRoot.children = populateNodePage([folder, file]);
				folder.parent = localRoot;
				file.parent = localRoot;

				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: true })
						}
					>
						<NodesSelectionModalContent
							confirmAction={confirmAction}
							confirmLabel="Select"
							title="Select nodes"
							closeAction={noop}
							canSelectOpenedFolder
							maxSelection={undefined}
						/>
					</div>,
					{
						mocks
					}
				);
				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);
				// confirm button is disabled
				const confirmButton = screen.getByRole('button', { name: /select/i });
				expect(confirmButton).toBeVisible();
				expect(confirmButton).toBeDisabled();
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
				// confirm button is enabled because opened folder is a valid selection
				await waitFor(() => expect(confirmButton).toBeEnabled());
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });

				await user.click(screen.getByText(folder.name));
				// ugly but it's the only way to check the item is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// click again on folder item to deselect it

				await user.click(screen.getByText(folder.name));
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// confirm button remains enabled since opened folder is valid
				expect(confirmButton).toBeEnabled();
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				await user.click(confirmButton);
				// confirm action is called with local root node
				expect(confirmAction).toHaveBeenCalledWith([expect.objectContaining({ id: localRoot.id })]);
			});
		});

		describe('with criteria to select nodes', () => {
			test('only files are selectable; folders are still navigable but not selectable', async () => {
				const localRoot = populateLocalRoot();
				const file1 = populateFile();
				const file2 = populateFile();
				const folder = populateFolder(1);
				localRoot.children = populateNodePage([folder, file1, file2]);
				folder.parent = localRoot;
				file1.parent = localRoot;
				file2.parent = localRoot;

				const isValidSelection = jest
					.fn()
					.mockImplementation((node: Pick<Node, '__typename'>) => isFile(node));
				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: true })
						}
					>
						<NodesSelectionModalContent
							title="Only files"
							confirmAction={confirmAction}
							confirmLabel="Confirm"
							closeAction={noop}
							isValidSelection={isValidSelection}
							maxSelection={undefined}
							canSelectOpenedFolder
						/>
					</div>,
					{ mocks }
				);

				// wait for root list query to be executed
				jest.advanceTimersToNextTimer();
				await screen.findByText(/home/i);

				// navigate inside home
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				expect(screen.getByText(file1.name)).toBeVisible();
				expect(screen.getByText(file2.name)).toBeVisible();
				// folder is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder.name)).not.toHaveAttribute('disabled', '');
				// file is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file1.name)).not.toHaveAttribute('disabled', '');
				const confirmButton = screen.getByRole('button', { name: /confirm/i });
				// confirm button is disabled because local root is not a file
				expect(confirmButton).toBeDisabled();
				// click on file
				await user.click(screen.getByText(file1.name));
				// confirm button becomes enabled
				await waitFor(() => expect(confirmButton).toBeEnabled());
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// ugly but it's the only way to check the item is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file1.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// click on folder
				await user.click(screen.getByText(folder.name));
				// confirm button remains enabled but selection is not changed
				expect(confirmButton).toBeEnabled();
				// file 1 is still active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file1.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// folder is not visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// number of selected node is not changed
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// click on other file
				await user.click(screen.getByText(file2.name));
				// confirm button remains enabled
				expect(confirmButton).toBeEnabled();
				// file 1 is still active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file1.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// folder is not visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// file 2 is now also active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file2.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith([
					expect.objectContaining({ id: file1.id, name: file1.name }),
					expect.objectContaining({ id: file2.id, name: file2.name })
				]);
			});

			test('only folders are selectable; folders are navigable and selectable, files are fully disabled', async () => {
				const localRoot = populateLocalRoot();
				const file = populateFile();
				const folder1 = populateFolder(1);
				const folder2 = populateFolder(1);
				localRoot.children = populateNodePage([folder1, folder2, file]);
				folder1.parent = localRoot;
				folder2.parent = localRoot;
				file.parent = localRoot;

				const isValidSelection = jest
					.fn()
					.mockImplementation((node: Pick<Node, '__typename'>) => isFolder(node));
				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot]),
						getNode: mockGetNode({
							getChildren: [localRoot],
							getPermissions: [localRoot],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: true })
						}
					>
						<NodesSelectionModalContent
							title="Only folders"
							confirmAction={confirmAction}
							confirmLabel="Confirm"
							closeAction={noop}
							isValidSelection={isValidSelection}
							maxSelection={undefined}
							canSelectOpenedFolder
						/>
					</div>,
					{ mocks }
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);

				// navigate inside home
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(folder1.name);
				expect(screen.getByText(folder1.name)).toBeVisible();
				expect(screen.getByText(folder2.name)).toBeVisible();
				expect(screen.getByText(file.name)).toBeVisible();
				// folder is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder1.name)).not.toHaveAttribute('disabled', '');
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(folder2.name)).not.toHaveAttribute('disabled', '');
				// file is disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(file.name)).toHaveAttribute('disabled', '');
				const confirmButton = screen.getByRole('button', { name: /confirm/i });
				// confirm button is enabled because local root is a valid node
				expect(confirmButton).toBeEnabled();
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// click on folder

				await user.click(screen.getByText(folder1.name));
				// confirm button is still enabled
				expect(confirmButton).toBeEnabled();
				// folder 1 is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder1.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// number of selected element is not changed because folder item from list has replaced opened folder in selection
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// click on file

				await user.click(screen.getByText(file.name));
				// confirm button remains enable but selection is not changed
				expect(confirmButton).toBeEnabled();
				// folder 1 is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder1.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// file is not visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// number of selected element is not changed because folder item from list has replaced opened folder in selection
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// click on other folder

				await user.click(screen.getByText(folder2.name));
				// folder 2 is now also active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder2.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// folder 1 is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(folder1.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// file is not visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(file.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// number of selected element is changed
				expect(screen.getByText(/2 elements selected/i)).toBeVisible();
				// confirm button is enabled
				expect(confirmButton).toBeEnabled();
				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalled();
				expect(confirmAction).toHaveBeenCalledWith([
					expect.objectContaining({ id: folder1.id, name: folder1.name }),
					expect.objectContaining({ id: folder2.id, name: folder2.name })
				]);
			});

			test('custom validity check set nodes that are not a valid selection as disabled. Folders remain navigable, files are fully disabled', async () => {
				const localRoot = populateLocalRoot();
				const validFile = populateFile(undefined, 'valid file');
				const validFolder = populateFolder(1, undefined, 'valid folder');
				const invalidFile = populateFile(undefined, 'not valid file');
				const invalidFolder = populateFolder(0, undefined, 'not valid folder');
				localRoot.children.nodes.push(validFile, validFolder, invalidFile, invalidFolder);
				validFolder.parent = localRoot;
				validFile.parent = localRoot;
				invalidFolder.parent = localRoot;
				invalidFile.parent = localRoot;

				const isValidSelection = jest
					.fn()
					.mockImplementation((node: Pick<Node, 'name'>) => node.name.startsWith('valid'));
				const confirmAction = jest.fn();

				const mocks = {
					Query: {
						getRootsList: mockGetRootsList(),
						getPath: mockGetPath([localRoot], [localRoot, invalidFolder]),
						getNode: mockGetNode({
							getChildren: [localRoot, invalidFolder],
							getPermissions: [localRoot, invalidFolder],
							getBaseNode: [localRoot]
						})
					}
				} satisfies Partial<Resolvers>;

				const { findByTextWithMarkup, user } = setup(
					<div
						onClick={(): void =>
							resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: undefined })
						}
					>
						<NodesSelectionModalContent
							title="Custom selector"
							confirmAction={confirmAction}
							confirmLabel="Confirm"
							closeAction={noop}
							isValidSelection={isValidSelection}
							maxSelection={undefined}
						/>
					</div>,
					{ mocks }
				);

				await screen.findByText(/home/i);
				// wait for root list query to be executed
				await waitFor(() =>
					expect(
						global.apolloClient.readQuery<GetRootsListQuery, GetRootsListQueryVariables>({
							query: GetRootsListDocument
						})?.getRootsList || null
					).not.toBeNull()
				);

				// navigate inside home
				await user.dblClick(screen.getByText(/home/i));
				await screen.findByText(validFolder.name);
				expect(screen.getByText(validFolder.name)).toBeVisible();
				expect(screen.getByText(validFile.name)).toBeVisible();
				expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
				// valid folder is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(validFolder.name)).not.toHaveAttribute('disabled', '');
				// valid file is not disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(validFile.name)).not.toHaveAttribute('disabled', '');
				// invalid file is disabled
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(invalidFile.name)).toHaveAttribute('disabled', '');
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				// invalid folder is not disabled because is navigable
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(screen.getByText(invalidFolder.name)).not.toHaveAttribute('disabled', '');
				const confirmButton = screen.getByRole('button', { name: /confirm/i });
				// confirm button is disabled because local root is not selectable by param
				expect(confirmButton).toBeDisabled();
				// click on valid folder

				await user.click(screen.getByText(validFolder.name));
				// confirm button becomes enabled
				expect(confirmButton).toBeEnabled();
				// valid folder is visibly active
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(validFolder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				// click on invalid folder does not change selection

				await user.click(screen.getByText(invalidFolder.name));
				expect(confirmButton).toBeEnabled();
				expect(screen.getByText(/1 element selected/i)).toBeVisible();
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(validFolder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(invalidFolder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// click on valid file change selection

				await user.click(screen.getByText(validFile.name));
				expect(confirmButton).toBeEnabled();
				expect(screen.getByText(/2 elements selected/i)).toBeVisible();
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(validFolder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(invalidFolder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(validFile.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				// click on invalid file does not change selection

				await user.click(screen.getByText(invalidFile.name));
				expect(confirmButton).toBeEnabled();
				expect(screen.getByText(/2 elements selected/i)).toBeVisible();
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(validFolder.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(invalidFolder.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(validFile.id)), HoverContainer)
				).toHaveStyle({ background: COLORS.highlight.regular });
				expect(
					findStyled(screen.getByTestId(SELECTORS.nodeItem(invalidFile.id)), HoverContainer)
				).not.toHaveStyle({ background: COLORS.highlight.regular });
				// call confirm action

				await user.click(confirmButton);
				expect(confirmAction).toHaveBeenCalledTimes(1);
				expect(confirmAction).toHaveBeenCalledWith([
					expect.objectContaining({ id: validFolder.id, name: validFolder.name }),
					expect.objectContaining({ id: validFile.id, name: validFile.name })
				]);
				// navigation inside invalid folder is enabled

				await user.dblClick(screen.getByText(invalidFolder.name));
				await screen.findByText(/nothing here/i);
				await findByTextWithMarkup(
					buildBreadCrumbRegExp('Files', localRoot.name, invalidFolder.name)
				);
				expect(screen.queryByText(validFolder.name)).not.toBeInTheDocument();
				expect(screen.queryByText(validFile.name)).not.toBeInTheDocument();
				expect(screen.queryByText(invalidFile.name)).not.toBeInTheDocument();
				// confirm button is disabled because navigation has reset selection and opened
				// folder is not a valid selection by param (and also by validity check)
				expect(confirmButton).toBeDisabled();
				expect(screen.queryByText(/elements? selected/i)).not.toBeInTheDocument();
				// reset calls
				confirmAction.mockReset();

				await user.click(confirmButton);
				expect(confirmAction).not.toHaveBeenCalled();
			});
		});
	});

	describe('Create folder', () => {
		test('Create folder button is hidden by default', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children = populateNodePage([folder, file]);
			folder.parent = localRoot;
			file.parent = localRoot;

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot]
					})
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// confirm button is disabled
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
		});

		test('Create folder button is visible on folders if canCreateFolder prop is true', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children = populateNodePage([folder, file]);
			folder.parent = localRoot;
			file.parent = localRoot;

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot]
					})
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// confirm button is disabled
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			// new folder button is visible inside a folder
			expect(screen.getByRole('button', { name: /new folder/i })).toBeVisible();
		});

		test('Create folder button is hidden in shared with me list', async () => {
			const sharedFolder = populateFolder();
			const folder = populateFolder();
			const file = populateFile();
			sharedFolder.children = populateNodePage([folder, file]);
			folder.parent = sharedFolder;
			file.parent = sharedFolder;

			const nodes = [sharedFolder];

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					findNodes: mockFindNodes(nodes),
					getPath: mockGetPath([sharedFolder]),
					getNode: mockGetNode({
						getChildren: [sharedFolder],
						getPermissions: [sharedFolder],
						getBaseNode: [sharedFolder]
					})
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// confirm button is disabled
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
			await user.dblClick(screen.getByText(/shared with me/i));
			await screen.findByText(sharedFolder.name);
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
			await user.dblClick(screen.getByText(sharedFolder.name));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp(sharedFolder.name));
			// new folder button is visible inside a folder
			expect(screen.getByRole('button', { name: /new folder/i })).toBeVisible();
		});

		test('Create folder button is disabled and has a tooltip if folder does not have permission to create folder', async () => {
			const sharedFolder = populateFolder();
			const folder = populateFolder();
			const file = populateFile();
			sharedFolder.children = populateNodePage([folder, file]);
			sharedFolder.permissions.can_write_folder = false;
			folder.parent = sharedFolder;
			file.parent = sharedFolder;

			const nodes = [sharedFolder];

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					findNodes: mockFindNodes(nodes),
					getPath: mockGetPath([sharedFolder]),
					getNode: mockGetNode({
						getChildren: [sharedFolder],
						getPermissions: [sharedFolder],
						getBaseNode: [sharedFolder]
					})
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// confirm button is disabled
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
			await user.dblClick(screen.getByText(/shared with me/i));
			await screen.findByText(sharedFolder.name);
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
			await user.dblClick(screen.getByText(sharedFolder.name));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp(sharedFolder.name));
			// new folder button is visible inside a folder
			const createFolderButton = screen.getByRole('button', { name: /new folder/i });
			const createFolderButtonLabel = within(createFolderButton).getByText(/new folder/i);
			expect(createFolderButton).toBeVisible();
			expect(createFolderButton).toBeDisabled();
			act(() => {
				// run tooltip timer to register listeners
				jest.runOnlyPendingTimers();
			});
			await user.hover(createFolderButtonLabel);
			const tooltip = await screen.findByText(/you don't have the correct permissions/i);
			expect(tooltip).toBeVisible();
			await user.click(createFolderButton);
			expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
			expect(screen.queryByRole('textbox', { name: /new folder's name/i })).not.toBeInTheDocument();
			await user.unhover(createFolderButtonLabel);
			expect(tooltip).not.toBeInTheDocument();
		});

		test('Create folder input is hidden on navigation between folders and value of input is cleared', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children = populateNodePage([folder, file]);
			localRoot.permissions.can_write_folder = true;
			folder.parent = localRoot;
			folder.permissions.can_write_folder = true;
			file.parent = localRoot;
			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot], [localRoot, folder]),
					getNode: mockGetNode({
						getChildren: [localRoot, folder],
						getPermissions: [localRoot, folder],
						getBaseNode: [localRoot, folder]
					})
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const newFolderName = 'new folder name';

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			// new folder button is visible inside a folder
			let newFolderButton = screen.getByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();
			expect(newFolderButton).toBeEnabled();

			await user.click(newFolderButton);
			let inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			let createActionButton = await screen.findByRole('button', { name: /create/i });
			expect(createActionButton).toBeDisabled();
			await user.type(inputElement, newFolderName);
			await waitFor(() => expect(createActionButton).toBeEnabled());
			expect(inputElement).toHaveValue(newFolderName);
			await user.dblClick(screen.getByText(folder.name));
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name, folder.name));
			await screen.findByText(/nothing here/i);
			newFolderButton = screen.getByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();
			expect(inputElement).not.toBeInTheDocument();
			expect(createActionButton).not.toBeInTheDocument();
			expect(newFolderButton).toBeEnabled();

			await user.click(newFolderButton);
			inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			createActionButton = await screen.findByRole('button', { name: /create/i });
			expect(createActionButton).toBeDisabled();
			expect(inputElement).not.toHaveValue(newFolderName);
			expect(inputElement).toHaveValue('');
		});

		test('Create folder input is hidden on selection of a node and value of input is cleared', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children = populateNodePage([folder, file]);
			localRoot.permissions.can_write_folder = true;
			folder.parent = localRoot;
			folder.permissions.can_write_folder = true;
			file.parent = localRoot;

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot, folder]
					})
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const newFolderName = 'new folder name';

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// wait for root list query to be executed
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			// new folder button is visible inside a folder
			let newFolderButton = screen.getByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();
			expect(newFolderButton).toBeEnabled();

			await user.click(newFolderButton);
			let inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			let createActionButton = await screen.findByRole('button', { name: /create/i });
			expect(createActionButton).toBeDisabled();
			await user.type(inputElement, newFolderName);
			await waitFor(() => expect(createActionButton).toBeEnabled());
			expect(inputElement).toHaveValue(newFolderName);
			await user.click(screen.getByText(folder.name));
			await waitFor(() => expect(screen.getByRole('button', { name: /select/i })).toBeEnabled());
			newFolderButton = await screen.findByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();
			expect(inputElement).not.toBeInTheDocument();
			expect(createActionButton).not.toBeInTheDocument();
			expect(newFolderButton).toBeEnabled();

			await user.click(newFolderButton);
			inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			createActionButton = await screen.findByRole('button', { name: /create/i });
			expect(createActionButton).toBeDisabled();
			expect(inputElement).not.toHaveValue(newFolderName);
			expect(inputElement).toHaveValue('');
		});

		test('Create folder action creates a new folder, adds it to the list in its ordered position and selects it', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children = populateNodePage([folder, file]);
			localRoot.permissions.can_write_folder = true;
			folder.parent = localRoot;
			file.parent = localRoot;

			const newFolder = populateFolder();

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot, newFolder]
					})
				},
				Mutation: {
					createFolder: mockCreateFolder(newFolder)
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);
			const confirmAction = jest.fn();

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={confirmAction}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// confirm button is disabled
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			const newFolderButton = screen.getByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();
			expect(newFolderButton).toBeEnabled();

			await user.click(newFolderButton);
			const inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			const createActionButton = await screen.findByRole('button', { name: /create/i });
			expect(createActionButton).toBeDisabled();
			await user.type(inputElement, newFolder.name);
			await waitFor(() => expect(createActionButton).toBeEnabled());
			await user.click(createActionButton);
			await screen.findByTestId(SELECTORS.nodeItem(newFolder.id));
			expect(screen.queryByRole(/create/i)).not.toBeInTheDocument();
			expect(screen.queryByRole('textbox', { name: /new folder's name/i })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: /new folder/i })).toBeVisible();
			expect(screen.getByText(newFolder.name)).toBeVisible();
			expect(screen.getByRole('button', { name: /select/i })).toBeEnabled();

			await user.click(screen.getByRole('button', { name: /select/i }));
			expect(confirmAction).toHaveBeenCalled();
			expect(confirmAction).toHaveBeenCalledWith([
				expect.objectContaining({ id: newFolder.id, name: newFolder.name })
			]);
		});

		test('Error does not create snackbar and is shown in input. Typing reset error', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children = populateNodePage([folder, file]);
			localRoot.permissions.can_write_folder = true;
			folder.parent = localRoot;
			file.parent = localRoot;

			const newFolder = populateFolder();

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot]
					})
				},
				Mutation: {
					createFolder: mockErrorResolver(generateError('A folder with same name already exists'))
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// confirm button is disabled
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			const newFolderButton = screen.getByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();

			await user.click(newFolderButton);
			const inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			const createActionButton = await screen.findByRole('button', { name: /create/i });
			await user.type(inputElement, newFolder.name);
			await waitFor(() => expect(createActionButton).toBeEnabled());
			await user.click(createActionButton);
			await screen.findAllByText(/A folder with same name already exists/i);
			expect(screen.getAllByText(/A folder with same name already exists/i)).toHaveLength(2);
			// close snackbar
			act(() => {
				// run timers of snackbar
				jest.runOnlyPendingTimers();
			});
			// only the one inside modal remains visible
			expect(screen.getByText(/A folder with same name already exists/i)).toBeInTheDocument();
			expect(screen.getByText(/A folder with same name already exists/i)).toBeVisible();
			await user.type(inputElement, 'something else');
			expect(inputElement).toHaveValue(`${newFolder.name}something else`);
			expect(screen.queryByText(/A folder with same name already exists/i)).not.toBeInTheDocument();
		});

		test('Close action does not call confirm', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children = populateNodePage([folder, file]);
			localRoot.permissions.can_write_folder = true;
			folder.parent = localRoot;
			file.parent = localRoot;

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot]),
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getBaseNode: [localRoot]
					})
				},
				Mutation: {
					createFolder: mockErrorResolver(generateError('A folder with same name already exists'))
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);
			const confirmAction = jest.fn();
			const closeAction = jest.fn();
			const { user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={confirmAction}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={closeAction}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			// confirm button is disabled
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			await user.click(screen.getByText(/home/i));
			await waitFor(() => expect(screen.getByRole('button', { name: /select/i })).toBeEnabled());
			expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.close));
			expect(closeAction).toHaveBeenCalled();
			expect(confirmAction).not.toHaveBeenCalled();
		});

		test('Create folder input is hidden on navigation through breadcrumb', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const file = populateFile();
			localRoot.children.nodes = [folder, file];
			localRoot.permissions.can_write_folder = true;
			folder.parent = localRoot;
			folder.permissions.can_write_folder = true;
			file.parent = localRoot;

			const mocks = {
				Query: {
					getRootsList: mockGetRootsList(),
					getPath: mockGetPath([localRoot], [localRoot, folder]),
					getNode: mockGetNode({
						getChildren: [localRoot, folder],
						getPermissions: [localRoot, folder],
						getBaseNode: [localRoot, folder]
					})
				}
			} satisfies Partial<Resolvers>;

			const isValidSelection = jest.fn().mockReturnValue(true);

			const newFolderName = 'new folder name';

			const { findByTextWithMarkup, user } = setup(
				<div
					onClick={(): void =>
						resetToDefault({ maxSelection: undefined, canSelectOpenedFolder: false })
					}
				>
					<NodesSelectionModalContent
						confirmAction={noop}
						confirmLabel="Select"
						title="Select nodes"
						closeAction={noop}
						canSelectOpenedFolder={false}
						maxSelection={undefined}
						isValidSelection={isValidSelection}
						canCreateFolder
					/>
				</div>,
				{
					mocks
				}
			);

			// wait for root list query to be executed
			jest.advanceTimersToNextTimer();
			await screen.findByText(/home/i);
			expect(screen.getByRole('button', { name: /select/i })).toBeVisible();
			await user.dblClick(screen.getByText(/home/i));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			await user.dblClick(screen.getByText(folder.name));
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name, folder.name));
			await screen.findByText(/nothing here/i);
			// new folder button is visible inside a folder
			let newFolderButton = screen.getByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();
			expect(newFolderButton).toBeEnabled();

			await user.click(newFolderButton);
			let inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			let createActionButton = await screen.findByRole('button', { name: /create/i });
			expect(createActionButton).toBeDisabled();
			await user.type(inputElement, newFolderName);
			await waitFor(() => expect(createActionButton).toBeEnabled());
			expect(inputElement).toHaveValue(newFolderName);
			// navigate back to local root folder
			await user.click(screen.getByText(localRoot.name));
			await screen.findByText(folder.name);
			await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
			// input is hidden and new folder button is visible
			newFolderButton = await screen.findByRole('button', { name: /new folder/i });
			expect(newFolderButton).toBeVisible();
			expect(inputElement).not.toBeInTheDocument();
			expect(createActionButton).not.toBeInTheDocument();
			expect(newFolderButton).toBeEnabled();
			// input value is reset

			await user.click(newFolderButton);
			inputElement = await screen.findByRole('textbox', { name: /new folder's name/i });
			createActionButton = await screen.findByRole('button', { name: /create/i });
			expect(createActionButton).toBeDisabled();
			// write again inside the input element
			await user.type(inputElement, newFolderName);
			await waitFor(() => expect(createActionButton).toBeEnabled());
			expect(inputElement).toHaveValue(newFolderName);
			// navigate back to root list through breadcrumb
			await user.click(screen.getByText(/files/i));
			await screen.findByText(/home/i);
			// input is hidden
			expect(screen.queryByRole('textbox', { name: /new folder's name/i })).not.toBeInTheDocument();
			// create button is hidden
			expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
			// new folder button is hidden
			expect(screen.queryByRole('button', { name: /new folder/i })).not.toBeInTheDocument();
		});
	});
});
