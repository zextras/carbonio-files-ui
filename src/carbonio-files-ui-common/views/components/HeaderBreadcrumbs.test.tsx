/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { gql } from '@apollo/client';
import {
	act,
	fireEvent,
	screen,
	waitFor,
	waitForElementToBeRemoved,
	within
} from '@testing-library/react';
import { forEach, map, find } from 'lodash';

import { UseNavigationHook } from '../../../hooks/useNavigation';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DRAG_TYPES, TIMERS } from '../../constants';
import {
	populateFolder,
	populateNodes,
	populateParents,
	populateUser
} from '../../mocks/mockUtils';
import { Node } from '../../types/graphql/types';
import { mockGetParent, mockGetPath, mockMoveNodes } from '../../utils/mockUtils';
import { buildBreadCrumbRegExp, setup } from '../../utils/testUtils';
import { HeaderBreadcrumbs } from './HeaderBreadcrumbs';

let mockedUseNavigationHook: ReturnType<UseNavigationHook>;

jest.mock('../../../hooks/useNavigation', () => ({
	useNavigation: (): ReturnType<UseNavigationHook> => mockedUseNavigationHook
}));

let dataTransfer: (
	initialData?: Map<string, string>
) => Pick<DataTransfer, 'setData' | 'setDragImage' | 'getData' | 'types' | 'clearData'>;

beforeEach(() => {
	const dataTransferData = new Map();
	dataTransfer = jest.fn(
		(
			initialData?: Map<string, string>
		): Pick<DataTransfer, 'setData' | 'setDragImage' | 'getData' | 'types' | 'clearData'> => {
			if (initialData) {
				initialData.forEach((value, key) => dataTransferData.set(key, value));
			}
			return {
				setDragImage: jest.fn(),
				setData: jest.fn().mockImplementation((type: string, data: string) => {
					dataTransferData.set(type, data);
				}),
				getData: jest.fn().mockImplementation((type: string) => dataTransferData.get(type)),
				types: Array.from(dataTransferData.keys()),
				clearData: jest.fn().mockImplementation(() => {
					dataTransferData.clear();
				})
			};
		}
	);

	mockedUseNavigationHook = {
		navigateTo: jest.fn(),
		navigateToFolder: jest.fn(),
		navigateBack: jest.fn
	};
});

describe('Header Breadcrumbs', () => {
	describe('Drag and drop', () => {
		test('Drag and drop is disabled if folder id is empty', () => {
			const crumbs = [{ id: 'Filter', label: 'Filter' }];
			setup(
				<>
					<HeaderBreadcrumbs crumbs={crumbs} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks: [] }
			);
			const destinationCrumbItem = screen.getByText('Filter');
			expect(destinationCrumbItem).toBeVisible();
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.queryByTestId('drop-crumb');
			expect(breadcrumbCrumbs).not.toBeInTheDocument();
			expect(destinationCrumbItem).not.toHaveStyle({
				'background-color': 'rgba(43, 115, 210, 0.4)'
			});
			expect(destinationCrumbItem).not.toHaveStyle({
				'background-color': 'rgba(130, 130, 130, 0.4)'
			});
		});

		test('Drop on a crumb trigger move action', async () => {
			const owner = populateUser();
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			forEach(path, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.owner = owner;
			});

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path),
				mockMoveNodes(
					{
						destination_id: path[0].id,
						node_ids: map(movingNodes, (node) => node.id)
					},
					map(movingNodes, (node) => ({ ...node, parent: path[0] }))
				)
			];

			const { getByTextWithMarkup, user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(
					buildBreadCrumbRegExp((currentFolder.parent as Node).name, currentFolder.name)
				)
			).toBeVisible();
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronRight')).toBeVisible();
			expect(screen.queryByTestId('icon: ChevronLeft')).not.toBeInTheDocument();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByText(/hide previous folders/i);
			expect(screen.queryByTestId('icon: ChevronRight')).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronLeft')).toBeVisible();
			const destinationCrumbItem = await screen.findByText(path[0].name);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
			).toBeVisible();
			// TODO: move fragment to graphql file and add type
			// add missing data in cache
			global.apolloClient.writeFragment({
				fragment: gql`
					fragment NodeOwner on Node {
						owner {
							id
							email
							full_name
						}
					}
				`,
				id: global.apolloClient.cache.identify(path[0]),
				data: {
					owner
				}
			});

			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId('drop-crumb');
			const destinationCrumb = find(
				breadcrumbCrumbs,
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': 'rgba(43, 115, 210, 0.4)'
			});
			fireEvent.drop(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(destinationCrumb).toHaveStyle({
				'background-color': ''
			});
			fireEvent.dragEnd(mockDraggedItem, { dataTransfer: dataTransfer() });
			const snackbar = await screen.findByText(/item moved/i);
			expect(snackbar).toBeVisible();
		});

		test('Drop on current folder crumb does not trigger move action if crumb is parent of nodes', async () => {
			const owner = populateUser();
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			forEach(path, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.owner = owner;
			});

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const moveMutationFn = jest.fn();

			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path),
				mockMoveNodes(
					{
						destination_id: currentFolder.id,
						node_ids: map(movingNodes, (node) => node.id)
					},
					map(movingNodes, (node) => ({ ...node, parent: currentFolder })),
					moveMutationFn
				)
			];

			const { getByTextWithMarkup, user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(
					buildBreadCrumbRegExp((currentFolder.parent as Node).name, currentFolder.name)
				)
			).toBeVisible();
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronRight')).toBeVisible();
			expect(screen.queryByTestId('icon: ChevronLeft')).not.toBeInTheDocument();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByText(/hide previous folders/i);
			expect(screen.queryByTestId('icon: ChevronRight')).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronLeft')).toBeVisible();
			const destinationCrumbItem = await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
			).toBeVisible();
			// TODO: move fragment to graphql file and add type
			// add missing data in cache
			global.apolloClient.writeFragment({
				fragment: gql`
					fragment NodeOwner on Node {
						owner {
							id
							email
							full_name
						}
					}
				`,
				id: global.apolloClient.cache.identify(currentFolder),
				data: {
					owner
				}
			});

			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId('drop-crumb');
			const destinationCrumb = find(
				breadcrumbCrumbs,
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).not.toHaveStyle({
				'background-color': 'rgba(43, 115, 210, 0.4)'
			});
			fireEvent.drop(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(mockDraggedItem, { dataTransfer: dataTransfer() });
			// wait a tick to let mutation be called
			await waitFor(
				() =>
					new Promise((resolve) => {
						setTimeout(resolve, 1);
					})
			);
			expect(moveMutationFn).not.toHaveBeenCalled();
		});

		test('Long hover on a crumb while dragging trigger navigation', async () => {
			const owner = populateUser();
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			const parent = populateFolder();
			parent.permissions.can_write_file = true;
			parent.permissions.can_write_folder = true;
			parent.owner = owner;
			currentFolder.parent = parent;

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const mocks = [mockGetParent({ node_id: currentFolder.id }, currentFolder)];

			const { getByTextWithMarkup } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			const destinationCrumbItem = await screen.findByText(parent.name);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(parent.name, currentFolder.name))
			).toBeVisible();
			// TODO: move fragment to graphql file and add type
			// add missing data in cache
			global.apolloClient.writeFragment({
				fragment: gql`
					fragment NodeOwner on Node {
						owner {
							id
							email
							full_name
						}
					}
				`,
				id: global.apolloClient.cache.identify(parent),
				data: {
					owner
				}
			});

			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId('drop-crumb');
			const destinationCrumb = find(
				breadcrumbCrumbs,
				(crumb) => within(crumb).queryByText(parent.name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': 'rgba(43, 115, 210, 0.4)'
			});
			// wait for navigation to start
			await waitFor(() => expect(mockedUseNavigationHook.navigateToFolder).toHaveBeenCalled());
			fireEvent.dragLeave(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(mockedUseNavigationHook.navigateToFolder).toHaveBeenCalledWith(
				parent.id,
				expect.objectContaining({ type: 'dragenter' })
			);
		});

		test('Long hover on a crumb without permissions does not trigger navigation', async () => {
			const owner = populateUser();
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			const parent = populateFolder();
			parent.permissions.can_write_file = false;
			parent.permissions.can_write_folder = false;
			parent.owner = owner;
			currentFolder.parent = parent;

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const mocks = [mockGetParent({ node_id: currentFolder.id }, currentFolder)];

			const { getByTextWithMarkup } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			const destinationCrumbItem = await screen.findByText(parent.name);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(parent.name, currentFolder.name))
			).toBeVisible();
			// TODO: move fragment to graphql file and add type
			// add missing data in cache
			global.apolloClient.writeFragment({
				fragment: gql`
					fragment NodeOwner on Node {
						owner {
							id
							email
							full_name
						}
					}
				`,
				id: global.apolloClient.cache.identify(parent),
				data: {
					owner
				}
			});

			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId('drop-crumb');
			const destinationCrumb = find(
				breadcrumbCrumbs,
				(crumb) => within(crumb).queryByText(parent.name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': 'rgba(130, 130, 130, 0.4)'
			});
			// wait for navigation to start eventually
			jest.advanceTimersByTime(TIMERS.DRAG_NAVIGATION_TRIGGER);
			fireEvent.dragLeave(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(mockedUseNavigationHook.navigateToFolder).not.toHaveBeenCalled();
		});

		test('Drop on a crumb without right permission does not trigger action', async () => {
			const owner = populateUser();
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			forEach(path, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.owner = owner;
			});

			path[0].permissions.can_write_folder = false;
			path[0].permissions.can_write_file = false;

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const moveMutationFn = jest.fn();

			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path),
				mockMoveNodes(
					{
						destination_id: path[0].id,
						node_ids: map(movingNodes, (node) => node.id)
					},
					map(movingNodes, (node) => ({ ...node, parent: path[0] })),
					moveMutationFn
				)
			];

			const { getByTextWithMarkup, user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(
					buildBreadCrumbRegExp((currentFolder.parent as Node).name, currentFolder.name)
				)
			).toBeVisible();
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronRight')).toBeVisible();
			expect(screen.queryByTestId('icon: ChevronLeft')).not.toBeInTheDocument();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			expect(screen.queryByTestId('icon: ChevronRight')).not.toBeInTheDocument();
			await screen.findByText(/hide previous folders/i);
			expect(screen.getByTestId('icon: ChevronLeft')).toBeVisible();
			const destinationCrumbItem = await screen.findByText(path[0].name);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
			).toBeVisible();
			// TODO: move fragment to graphql file and add type
			// add missing data in cache
			global.apolloClient.writeFragment({
				fragment: gql`
					fragment NodeOwner on Node {
						owner {
							id
							email
							full_name
						}
					}
				`,
				id: global.apolloClient.cache.identify(path[0]),
				data: {
					owner
				}
			});

			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId('drop-crumb');
			const destinationCrumb = find(
				breadcrumbCrumbs,
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': 'rgba(130, 130, 130, 0.4)'
			});
			fireEvent.drop(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(destinationCrumb).toHaveStyle({
				'background-color': ''
			});
			fireEvent.dragEnd(mockDraggedItem, { dataTransfer: dataTransfer() });
			// wait a tick to allow mutation to eventually be executed
			expect(moveMutationFn).not.toHaveBeenCalled();
		});

		test('Drag on cta load full path', async () => {
			const owner = populateUser();
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			forEach(path, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.owner = owner;
			});

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path)
			];

			const { getByTextWithMarkup } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(
					buildBreadCrumbRegExp((currentFolder.parent as Node).name, currentFolder.name)
				)
			).toBeVisible();
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronRight')).toBeVisible();
			expect(screen.queryByTestId('icon: ChevronLeft')).not.toBeInTheDocument();
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(screen.getByTestId('icon: FolderOutline'));
			await waitForElementToBeRemoved(screen.queryByTestId('icon: ChevronRight'));
			expect(screen.getByTestId('icon: ChevronLeft')).toBeVisible();
			fireEvent.dragLeave(screen.getByTestId('icon: FolderOutline'));
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
			).toBeVisible();
		});

		test('Drag on collapser open breadcrumb dropdown to show hidden crumbs. If drag leave the collapser and enter the dropdown within the default timeout, the dropdown remains open. When mouse leave the dropdown, the dropdown is closed', async () => {
			const owner = populateUser();
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			forEach(path, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.owner = owner;
			});

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path)
			];

			const { getByTextWithMarkup, user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(
					buildBreadCrumbRegExp((currentFolder.parent as Node).name, currentFolder.name)
				)
			).toBeVisible();

			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronRight')).toBeVisible();
			expect(screen.queryByTestId('icon: ChevronLeft')).not.toBeInTheDocument();
			// simulate a drag of a node of the list
			await user.click(screen.getByTestId('icon: FolderOutline'));
			expect(screen.queryByTestId('icon: ChevronRight')).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronLeft')).toBeVisible();
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
			).toBeVisible();

			const breadcrumbsComponent = screen.getByTestId('customBreadcrumbs');
			jest.spyOn(breadcrumbsComponent, 'offsetWidth', 'get').mockReturnValue(450);
			jest.spyOn(breadcrumbsComponent, 'scrollWidth', 'get').mockReturnValue(500);

			act(() => {
				window.resizeTo(500, 300);
			});

			const collapserItem = await screen.findByText('…');
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(collapserItem, { dataTransfer: dataTransfer() });
			await screen.findByText(path[0].name);
			expect(screen.getByText(path[0].name)).toBeVisible();
			fireEvent.dragLeave(collapserItem, { dataTransfer: dataTransfer() });
			// wait less than the timeout to be sure that when mouse is over the dropdown of the breadcrumbs, it will not be closed by another event
			await waitFor(
				() =>
					new Promise((resolve) => {
						setTimeout(resolve, 100);
					})
			);
			fireEvent.dragEnter(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			fireEvent.dragOver(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			// now wait the default timeout to be sure the dropdown remains opened
			await waitFor(
				() =>
					new Promise((resolve) => {
						setTimeout(resolve, 150);
					})
			);
			expect(screen.getByText(path[0].name)).toBeVisible();
			fireEvent.dragLeave(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(screen.getByText('draggable element mock'), {
				dataTransfer: dataTransfer()
			});
			// when mouse leaves the dropdown, the dropdown is closed
			await waitForElementToBeRemoved(screen.queryByText(path[0].name));
		});

		test('Drag on a hidden crumb trigger move action', async () => {
			const owner = populateUser();
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			forEach(path, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.owner = owner;
			});

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path),
				mockMoveNodes(
					{
						destination_id: path[0].id,
						node_ids: map(movingNodes, (node) => node.id)
					},
					map(movingNodes, (node) => ({ ...node, parent: path[0] }))
				)
			];

			const { getByTextWithMarkup, user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(
					buildBreadCrumbRegExp((currentFolder.parent as Node).name, currentFolder.name)
				)
			).toBeVisible();

			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronRight')).toBeVisible();
			expect(screen.queryByTestId('icon: ChevronLeft')).not.toBeInTheDocument();
			// simulate a drag of a node of the list
			await user.click(screen.getByTestId('icon: FolderOutline'));
			expect(screen.queryByTestId('icon: ChevronRight')).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronLeft')).toBeVisible();
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
			).toBeVisible();
			// TODO: move fragment to graphql file and add type
			// add missing data in cache
			global.apolloClient.writeFragment({
				fragment: gql`
					fragment NodeOwner on Node {
						owner {
							id
							email
							full_name
						}
					}
				`,
				id: global.apolloClient.cache.identify(path[0]),
				data: {
					owner
				}
			});

			const breadcrumbsComponent = screen.getByTestId('customBreadcrumbs');
			jest.spyOn(breadcrumbsComponent, 'offsetWidth', 'get').mockReturnValue(450);
			jest.spyOn(breadcrumbsComponent, 'scrollWidth', 'get').mockReturnValue(500);

			act(() => {
				window.resizeTo(500, 300);
			});

			const collapserItem = await screen.findByText('…');
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(collapserItem, { dataTransfer: dataTransfer() });
			const destinationItem = await screen.findByText(path[0].name);
			expect(destinationItem).toBeVisible();
			fireEvent.dragLeave(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId('drop-crumb');
			const destinationCrumb = find(
				breadcrumbCrumbs,
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': 'rgba(43, 115, 210, 0.4)'
			});
			fireEvent.drop(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			expect(destinationCrumb).not.toHaveStyle({
				'background-color': 'rgba(43, 115, 210, 0.4)'
			});
			const snackbar = await screen.findByText(/Item moved/i);
			expect(snackbar).toBeVisible();
		});

		test('Drag on a hidden crumb without permissions does not trigger move action', async () => {
			const owner = populateUser();
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.owner = owner;
			forEach(path, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.owner = owner;
			});
			path[0].permissions.can_write_file = false;
			path[0].permissions.can_write_folder = false;

			const movingNodes = populateNodes(2);
			forEach(movingNodes, (mockedNode) => {
				mockedNode.parent = currentFolder;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
				mockedNode.owner = owner;
			});

			const moveMutationFn = jest.fn();

			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path),
				mockMoveNodes(
					{
						destination_id: path[0].id,
						node_ids: map(movingNodes, (node) => node.id)
					},
					map(movingNodes, (node) => ({ ...node, parent: path[0] })),
					moveMutationFn
				)
			];

			const { getByTextWithMarkup, user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			expect(
				getByTextWithMarkup(
					buildBreadCrumbRegExp((currentFolder.parent as Node).name, currentFolder.name)
				)
			).toBeVisible();

			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			expect(screen.getByTestId('icon: ChevronRight')).toBeVisible();
			expect(screen.queryByTestId('icon: ChevronLeft')).not.toBeInTheDocument();
			// simulate a drag of a node of the list
			await user.click(screen.getByTestId('icon: FolderOutline'));
			expect(screen.queryByTestId('icon: ChevronRight')).not.toBeInTheDocument();
			await screen.findByText(/hide previous folders/i);
			expect(screen.getByTestId('icon: ChevronLeft')).toBeVisible();
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
			).toBeVisible();
			// TODO: move fragment to graphql file and add type
			// add missing data in cache
			global.apolloClient.writeFragment({
				fragment: gql`
					fragment NodeOwner on Node {
						owner {
							id
							email
							full_name
						}
					}
				`,
				id: global.apolloClient.cache.identify(path[0]),
				data: {
					owner
				}
			});

			const breadcrumbsComponent = screen.getByTestId('customBreadcrumbs');
			jest.spyOn(breadcrumbsComponent, 'offsetWidth', 'get').mockReturnValue(450);
			jest.spyOn(breadcrumbsComponent, 'scrollWidth', 'get').mockReturnValue(500);

			act(() => {
				window.resizeTo(500, 300);
			});

			const collapserItem = await screen.findByText('…');
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(collapserItem, { dataTransfer: dataTransfer() });
			const destinationItem = await screen.findByText(path[0].name);
			expect(destinationItem).toBeVisible();
			fireEvent.dragLeave(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId('drop-crumb');
			const destinationCrumb = find(
				breadcrumbCrumbs,
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': 'rgba(130, 130, 130, 0.4)'
			});
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			expect(destinationCrumb).not.toHaveStyle({
				'background-color': 'rgba(130, 130, 130, 0.4)'
			});
			// wait a tick to allow mutation to eventually be executed
			expect(moveMutationFn).not.toHaveBeenCalled();
		});
	});
});
