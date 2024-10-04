/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { HeaderBreadcrumbs } from './HeaderBreadcrumbs';
import { UseNavigationHook } from '../../../hooks/useNavigation';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DRAG_TYPES, TIMERS } from '../../constants';
import { COLORS, ICON_REGEXP, SELECTORS } from '../../constants/test';
import {
	populateFolder,
	populateNodes,
	populateParents,
	populateUser
} from '../../mocks/mockUtils';
import {
	buildBreadCrumbRegExp,
	createMoveDataTransfer,
	setup,
	screen,
	within
} from '../../tests/utils';
import { Node } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockGetPath, mockMoveNodes } from '../../utils/resolverMocks';

let mockedUseNavigationHook: ReturnType<UseNavigationHook>;

jest.mock<typeof import('../../../hooks/useNavigation')>('../../../hooks/useNavigation', () => ({
	useNavigation: (): ReturnType<UseNavigationHook> => mockedUseNavigationHook
}));

beforeEach(() => {
	mockedUseNavigationHook = {
		navigateTo: jest.fn(),
		navigateToFolder: jest.fn(),
		navigateBack: jest.fn
	};
});

describe('Header Breadcrumbs', () => {
	describe('Drag and drop', () => {
		it('should not show the dropzone if folder id is empty', () => {
			const crumbs = [{ id: 'Filter', label: 'Filter' }];
			const dataTransfer = createMoveDataTransfer();
			setup(
				<>
					<HeaderBreadcrumbs crumbs={crumbs} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks: {} }
			);
			const destinationCrumbItem = screen.getByText('Filter');
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(screen.queryByTestId(SELECTORS.dropCrumb)).not.toBeInTheDocument();
			expect(destinationCrumbItem).not.toHaveStyle({
				background: COLORS.dropzone.enabled
			});
			expect(destinationCrumbItem).not.toHaveStyle({
				background: COLORS.dropzone.disabled
			});
		});

		test('on a crumb shows enabled dropzone and trigger move action', async () => {
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

			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				},
				Mutation: {
					moveNodes: mockMoveNodes(map(movingNodes, (node) => ({ ...node, parent: path[0] })))
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			const { user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			await screen.findByText(/hide previous folders/i);
			const destinationCrumbItem = await screen.findByText(path[0].name);
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId(SELECTORS.dropCrumb);
			const destinationCrumb = breadcrumbCrumbs.find(
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				background: COLORS.dropzone.enabled
			});
			fireEvent.drop(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(destinationCrumb).toHaveStyle({
				background: ''
			});
			fireEvent.dragEnd(mockDraggedItem, { dataTransfer: dataTransfer() });
			const snackbar = await screen.findByText(/item moved/i);
			expect(snackbar).toBeVisible();
		});

		test('on current folder crumb shows enabled dropzone but does not trigger move action if crumb is parent of nodes', async () => {
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

			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				},
				Mutation: {
					moveNodes: jest.fn(
						mockMoveNodes(
							movingNodes.map((node) => ({ ...node, parent: currentFolder }))
						) as () => Node[]
					)
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			const { user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			await screen.findByText(/hide previous folders/i);
			const destinationCrumbItem = await screen.findByText(currentFolder.name);
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId(SELECTORS.dropCrumb);
			const destinationCrumb = breadcrumbCrumbs.find(
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).not.toHaveStyle({
				background: COLORS.dropzone.enabled
			});
			fireEvent.drop(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(mockDraggedItem, { dataTransfer: dataTransfer() });
			await jest.advanceTimersToNextTimerAsync();
			expect(mocks.Mutation.moveNodes).not.toHaveBeenCalled();
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

			const mocks = {
				Query: {
					getPath: mockGetPath([parent, currentFolder])
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			const destinationCrumbItem = await screen.findByText(parent.name);
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
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

			const mocks = {
				Query: {
					getPath: mockGetPath([parent, currentFolder])
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			const destinationCrumbItem = await screen.findByText(parent.name);
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
			// wait for navigation to start eventually
			await jest.advanceTimersByTimeAsync(TIMERS.DRAG_NAVIGATION_TRIGGER);
			fireEvent.dragLeave(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(mockedUseNavigationHook.navigateToFolder).not.toHaveBeenCalled();
		});

		test('on a crumb without right permission shows disabled dropzone and does not trigger action', async () => {
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

			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				},
				Mutation: {
					moveNodes: jest.fn(
						mockMoveNodes(
							map(movingNodes, (node) => ({ ...node, parent: path[0] }))
						) as () => Node[]
					)
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			const { user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			await screen.findByText(/hide previous folders/i);
			const destinationCrumbItem = await screen.findByText(path[0].name);
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(destinationCrumbItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationCrumbItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId(SELECTORS.dropCrumb);
			const destinationCrumb = breadcrumbCrumbs.find(
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				background: COLORS.dropzone.disabled
			});
			fireEvent.drop(destinationCrumbItem, { dataTransfer: dataTransfer() });
			expect(destinationCrumb).toHaveStyle({
				background: ''
			});
			fireEvent.dragEnd(mockDraggedItem, { dataTransfer: dataTransfer() });
			// advance timers to allow mutation to eventually be executed
			await jest.advanceTimersToNextTimerAsync();
			expect(mocks.Mutation.moveNodes).not.toHaveBeenCalled();
		});

		test('on cta loads full path', async () => {
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

			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			// simulate a drag of a node of the list
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			fireEvent.dragLeave(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			expect(
				screen.getByTextWithMarkup(buildBreadCrumbRegExp(...path.map((parent) => parent.name)))
			).toBeVisible();
		});

		test('on collapser opens breadcrumb dropdown to show hidden crumbs. If drag leave the collapser and enter the dropdown within the default timeout, the dropdown remains open. When mouse leave the dropdown, the dropdown is closed', async () => {
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

			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			const { user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			// simulate a drag of a node of the list
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			const breadcrumbsComponent = screen.getByTestId(SELECTORS.customBreadcrumbs);
			jest.spyOn(breadcrumbsComponent, 'offsetWidth', 'get').mockReturnValue(450);
			jest.spyOn(breadcrumbsComponent, 'scrollWidth', 'get').mockReturnValue(500);
			act(() => {
				window.resizeTo(500, 300);
			});
			const collapserItem = await screen.findByText('…');
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(collapserItem, { dataTransfer: dataTransfer() });
			expect(await screen.findByText(path[0].name)).toBeVisible();
			fireEvent.dragLeave(collapserItem, { dataTransfer: dataTransfer() });
			// wait less than the timeout to be sure that when mouse is over the dropdown of the breadcrumbs, it will not be closed by another event
			await jest.advanceTimersByTimeAsync(TIMERS.DRAG_DELAY_CLOSE_DROPDOWN - 1);
			fireEvent.dragEnter(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			fireEvent.dragOver(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			// now wait the default timeout to be sure the dropdown remains opened
			await jest.advanceTimersByTimeAsync(TIMERS.DRAG_DELAY_CLOSE_DROPDOWN);
			expect(screen.getByText(path[0].name)).toBeVisible();
			fireEvent.dragLeave(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(screen.getByText('draggable element mock'), {
				dataTransfer: dataTransfer()
			});
			// when mouse leaves the dropdown, the dropdown is closed
			await waitForElementToBeRemoved(screen.queryByText(path[0].name));
		});

		test('on a hidden crumb shows enabled dropzone and trigger move action', async () => {
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

			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				},
				Mutation: {
					moveNodes: mockMoveNodes(map(movingNodes, (node) => ({ ...node, parent: path[0] })))
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			const { user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			// simulate a drag of a node of the list
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			const breadcrumbsComponent = screen.getByTestId(SELECTORS.customBreadcrumbs);
			jest.spyOn(breadcrumbsComponent, 'offsetWidth', 'get').mockReturnValue(450);
			jest.spyOn(breadcrumbsComponent, 'scrollWidth', 'get').mockReturnValue(500);
			act(() => {
				window.resizeTo(500, 300);
			});
			const collapserItem = await screen.findByText('…');
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(collapserItem, { dataTransfer: dataTransfer() });
			const destinationItem = await screen.findByText(path[0].name);
			fireEvent.dragLeave(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId(SELECTORS.dropCrumb);
			const destinationCrumb = breadcrumbCrumbs.find(
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': COLORS.dropzone.enabled
			});
			fireEvent.drop(screen.getByText(path[0].name), { dataTransfer: dataTransfer() });
			expect(destinationCrumb).not.toHaveStyle({
				'background-color': COLORS.dropzone.enabled
			});
			const snackbar = await screen.findByText(/Item moved/i);
			expect(snackbar).toBeVisible();
		});

		test('on a hidden crumb without permissions shows disabled dropzone and does not trigger move action', async () => {
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

			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				},
				Mutation: {
					moveNodes: jest.fn(
						mockMoveNodes(
							map(movingNodes, (node) => ({ ...node, parent: path[0] }))
						) as () => Node[]
					)
				}
			} satisfies Partial<Resolvers>;
			const dataTransfer = createMoveDataTransfer();
			const { user } = setup(
				<>
					<HeaderBreadcrumbs folderId={currentFolder.id} />
					<div draggable>draggable element mock</div>
				</>,
				{ mocks }
			);
			await screen.findByText(currentFolder.name);
			// simulate a drag of a node of the list
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			await screen.findByText(/hide previous folders/i);
			const breadcrumbsComponent = screen.getByTestId(SELECTORS.customBreadcrumbs);
			jest.spyOn(breadcrumbsComponent, 'offsetWidth', 'get').mockReturnValue(450);
			jest.spyOn(breadcrumbsComponent, 'scrollWidth', 'get').mockReturnValue(500);
			act(() => {
				window.resizeTo(500, 300);
			});
			const collapserItem = await screen.findByText('…');
			const mockDraggedItem = screen.getByText('draggable element mock');
			fireEvent.dragStart(mockDraggedItem, { dataTransfer: dataTransfer() });
			// set drag data as if a node of the list was dragged
			draggedItemsVar(movingNodes);
			dataTransfer().setData(DRAG_TYPES.move, JSON.stringify(movingNodes));
			fireEvent.dragEnter(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(collapserItem, { dataTransfer: dataTransfer() });
			const destinationItem = await screen.findByText(path[0].name);
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragLeave(collapserItem, { dataTransfer: dataTransfer() });
			fireEvent.dragOver(destinationItem, { dataTransfer: dataTransfer() });
			const breadcrumbCrumbs = screen.getAllByTestId(SELECTORS.dropCrumb);
			const destinationCrumb = breadcrumbCrumbs.find(
				(crumb) => within(crumb).queryByText(path[0].name) !== null
			);
			expect(destinationCrumb).toHaveStyle({
				'background-color': COLORS.dropzone.disabled
			});
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			expect(destinationCrumb).not.toHaveStyle({
				'background-color': COLORS.dropzone.disabled
			});
			// dropdown is closed
			await waitForElementToBeRemoved(destinationItem);
			// advance timers to allow mutation to eventually be executed
			await jest.advanceTimersToNextTimerAsync();
			expect(mocks.Mutation.moveNodes).not.toHaveBeenCalled();
		});
	});
});
