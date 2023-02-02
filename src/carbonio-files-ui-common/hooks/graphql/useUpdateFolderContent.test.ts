/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { find } from 'lodash';

import { NODES_LOAD_LIMIT, NODES_SORT_DEFAULT } from '../../constants';
import GET_CHILDREN from '../../graphql/queries/getChildren.graphql';
import {
	populateFile,
	populateFolder,
	populateNode,
	populateNodePage,
	populateNodes,
	sortNodes
} from '../../mocks/mockUtils';
import {
	Folder,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	Maybe,
	Node
} from '../../types/graphql/types';
import { getChildrenVariables } from '../../utils/mockUtils';
import { setupHook } from '../../utils/testUtils';
import { addNodeInSortedList } from '../../utils/utils';
import { UpdateFolderContentType, useUpdateFolderContent } from './useUpdateFolderContent';

describe('useUpdateFolderContent', () => {
	function readGetChildrenQuery(folderId: string, sort = NODES_SORT_DEFAULT): Folder {
		const queryResult = global.apolloClient.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
			query: GET_CHILDREN,
			variables: getChildrenVariables(folderId, NODES_LOAD_LIMIT * 2, sort)
		});
		expect(queryResult?.getNode || null).not.toBeNull();
		return queryResult?.getNode as Folder;
	}

	function prepareCache(
		folder: Folder,
		sort = NODES_SORT_DEFAULT,
		pageToken: string | null = null
	): void {
		global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
			query: GET_CHILDREN,
			variables: getChildrenVariables(folder.id, NODES_LOAD_LIMIT, sort),
			data: {
				getNode: {
					...folder,
					children: {
						nodes: folder.children.nodes.slice(
							0,
							Math.min(NODES_LOAD_LIMIT, folder.children.nodes.length)
						),
						page_token: pageToken
					}
				}
			}
		});
	}

	describe('add a new node not present in a folder', () => {
		it('should add the element at first position if folder has no children', async () => {
			const folder = populateFolder();

			prepareCache(folder);

			const element = populateNode();
			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			addNodeToFolder(folder, element);
			const queryResult = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GET_CHILDREN,
				variables: getChildrenVariables(folder.id)
			});
			expect((queryResult?.getNode || null) as Maybe<Folder>).not.toBeNull();
			expect((queryResult?.getNode as Folder).children.nodes).toHaveLength(1);
			// created element has to be the first and only element
			expect((queryResult?.getNode as Folder).children.nodes[0]?.id).toBe(element.id);
		});

		it('should add the element at the end if its next neighbor is not loaded yet', async () => {
			// create a folder with 2 elements more than the cached ones ( = NODES_LOAD_LIMIT)
			// this way we can simulate the creation of a node with a sort position after the last loaded child
			// and with a neighbor not loaded yet
			const folder = populateFolder(NODES_LOAD_LIMIT + 2);
			// extract new elements not loaded in cache to use them as the new
			// notLoadedElements[0] is the element that will be created
			// notLoadedElements[1] is the next neighbor
			const notLoadedElements = folder.children.nodes.splice(NODES_LOAD_LIMIT, 2) as Node[];

			prepareCache(folder);

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// call the hook
			addNodeToFolder(folder, notLoadedElements[0]);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id);

			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT + 1);
			// created element has to be at the end of the the list
			expect(childrenNodes[childrenNodes.length - 1]?.id).toBe(notLoadedElements[0].id);
		});

		it('should add the element before its neighbor if the neighbor is already loaded', async () => {
			// create a folder with all its children loaded in cache
			// this way we can simulate the creation of a node with a sort position before the last loaded child
			// and with a neighbor not loaded yet
			const folder = populateFolder();
			folder.children = populateNodePage(populateNodes(NODES_LOAD_LIMIT + 1, 'File'));
			const sort = NODES_SORT_DEFAULT;
			sortNodes(folder.children.nodes, sort);
			// extract the element that will be created from the children so that it will no be written in cache
			const elementIndex = Math.floor(NODES_LOAD_LIMIT / 2);
			const element = folder.children.nodes.splice(elementIndex, 1)[0] as Node;
			// the neighbor is at the index where we want to insert the new element
			const neighbor = folder.children.nodes[elementIndex] as Node;
			// so give to element a name that put it before neighbor
			element.name = neighbor.name.substring(0, neighbor.name.length - 1);

			prepareCache(folder, sort);

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// call the hook saying that there are no more children to load
			addNodeToFolder(folder, element);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id, sort);

			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT + 1);
			// at elementIndex has to be the created element
			expect(childrenNodes[elementIndex]?.id).toBe(element.id);
			// neighbor has to be at elementIndex + 1
			expect(childrenNodes[elementIndex + 1]?.id).toBe(neighbor.id);
		});

		it('should add the element at the end if it has no next neighbor and all children are already loaded', async () => {
			// create a folder with all its children loaded in cache
			// this way we can simulate the creation of a node with a sort position after the last loaded child
			// and with no neighbor
			const folder = populateFolder(NODES_LOAD_LIMIT + 1);
			const sort = NODES_SORT_DEFAULT;
			sortNodes(folder.children.nodes, sort);
			// extract the element that will be created from the children so that it will no be written in cache
			// the element is the last one of the folder
			const elementIndex = folder.children.nodes.length - 1;
			const element = folder.children.nodes.splice(elementIndex, 1)[0] as Node;

			prepareCache(folder, sort);

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// call the hook saying that there are no more children to load
			addNodeToFolder(folder, element);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id, sort);

			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT + 1);
			// last element has to be the created element
			expect(childrenNodes[NODES_LOAD_LIMIT]?.id).toBe(element.id);
		});

		it('should add the element at the end if it has no next neighbor but not all children are loaded yet', async () => {
			// create a folder with some children not loaded in cache
			// this way we can simulate the creation of a node with a sort position after the last loaded child
			// but with no neighbor
			const folder = populateFolder(NODES_LOAD_LIMIT + 2);
			// extract the element that will be created from the children so that it will no be written in cache
			// the element is the last one of the folder
			const elementIndex = folder.children.nodes.length - 1;
			const element = folder.children.nodes.splice(elementIndex, 1)[0] as Node;
			// element at position NODES_LOAD_LIMIT will not be written in cache
			// and should not be present in the list after the update
			const notLoadedElement = folder.children.nodes[folder.children.nodes.length - 1] as Node;

			prepareCache(folder);

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// call the hook saying that there are more children to load
			addNodeToFolder(folder, element);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id);

			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT + 1);
			// created element should be at last position in the list
			expect(childrenNodes[childrenNodes.length - 1]?.id).toBe(element.id);
			// the not loaded element should not be loaded
			expect(find(childrenNodes, (item) => item?.id === notLoadedElement.id)).not.toBeDefined();
		});

		it('should add the element at the end if it has a neighbor that is unordered', async () => {
			// create a folder with some children not loaded in cache
			// this way we can simulate the creation of multiple node with a sort position after the last loaded child
			const folder = populateFolder(NODES_LOAD_LIMIT);
			const newNodes = populateNodes(2, 'File');

			prepareCache(folder);

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// first create operation
			// give new files a name that will put them at the end of the list
			newNodes[0].name = `${folder.children.nodes[folder.children.nodes.length - 1]?.name} - n1`;
			newNodes[1].name = `${folder.children.nodes[folder.children.nodes.length - 1]?.name} - n2`;

			// call the hook saying that there are more children to load
			addNodeToFolder(folder, newNodes[0]);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id);

			expect(childrenNodes).toHaveLength(folder.children.nodes.length + 1);
			// created element should be at last position in the list
			expect(childrenNodes[childrenNodes.length - 1]?.id).toBe(newNodes[0].id);

			// second create operation
			// call the hook saying that there are more children to load
			addNodeToFolder(folder, newNodes[1]);
			const {
				children: { nodes: childrenNodes2 }
			} = readGetChildrenQuery(folder.id);

			expect(childrenNodes2).toHaveLength(folder.children.nodes.length + 2);
			// new created element should be at last position in the list even if its neighbor is loaded
			expect(childrenNodes2[childrenNodes2.length - 1]?.id).toBe(newNodes[1].id);
			expect(childrenNodes2[childrenNodes2.length - 2]?.id).toBe(newNodes[0].id);
		});
	});

	describe('update an existing node already loaded in a folder', () => {
		it('should move the element up in the list with all children loaded', async () => {
			// create a folder with all children loaded in cache
			// this way we can simulate the update of a node with a sort position different than the original one
			const folder = populateFolder(NODES_LOAD_LIMIT);

			prepareCache(folder);

			// to move a node up take the last element and move it with a rename
			const element = folder.children.nodes[folder.children.nodes.length - 1] as Node;
			element.name =
				folder.children.nodes[0]?.name.substring(0, folder.children.nodes[0].name.length) || '000';
			let newPos = addNodeInSortedList(folder.children.nodes, element, NODES_SORT_DEFAULT);
			newPos = newPos > -1 ? newPos : folder.children.nodes.length;

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// call the hook
			addNodeToFolder(folder, element);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id);

			// number of elements has not to be changed after the update
			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT);
			// updated element should be the first element of the list
			expect(childrenNodes[newPos]?.id).toBe(element.id);
			// last element of returned list should the second-last of the original list
			const secondLastElement = folder.children.nodes[folder.children.nodes.length - 2] as Node;
			expect(childrenNodes[childrenNodes.length - 1]?.id).toBe(secondLastElement.id);
		});

		it('should move the element down in the list with all children loaded', () => {
			// create a folder with all children loaded in cache
			// this way we can simulate the update of a node with a sort position different than the original one
			const folder = populateFolder(NODES_LOAD_LIMIT);

			prepareCache(folder);

			const element = folder.children.nodes[0] as Node;

			element.name = `${folder.children.nodes[folder.children.nodes.length - 1]?.name}-last`;

			let newPos = addNodeInSortedList(folder.children.nodes, element, NODES_SORT_DEFAULT);
			newPos = newPos > -1 ? newPos : folder.children.nodes.length;

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// call the hook saying that there are no more children to load
			addNodeToFolder(folder, element);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id);

			// number of elements has not to be changed after the update
			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT);
			// updated element should be the last element of the list
			expect(childrenNodes[newPos - 1]?.id).toBe(element.id);
			// first element of returned list should the second of the original list
			const secondElement = folder.children.nodes[1] as Node;
			expect(childrenNodes[0]?.id).toBe(secondElement.id);
		});

		it('should remove the reference from the partial list if the node is moved from unordered to ordered and viceversa', async () => {
			const folder = populateFolder(NODES_LOAD_LIMIT + 3);
			const sort = NODES_SORT_DEFAULT;
			// extract the element that will be created from the children so that it will no be written in cache
			// the element is the last one of the folder
			const elementIndex = folder.children.nodes.length - 2;
			const element = folder.children.nodes.splice(elementIndex, 1)[0] as Node;
			// element at position NODES_LOAD_LIMIT will not be written in cache
			// and should not be present in the list after the update
			const notLoadedElement = folder.children.nodes[folder.children.nodes.length - 1] as Node;

			prepareCache(folder);

			let newPos = addNodeInSortedList(
				folder.children.nodes.slice(0, NODES_LOAD_LIMIT),
				element,
				sort
			);
			newPos = newPos > -1 ? newPos : NODES_LOAD_LIMIT;

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// call the hook saying that there are more children to load
			addNodeToFolder(folder, element);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id, sort);

			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT + 1);
			// created element should be at last position in the list
			expect(childrenNodes[newPos]?.id).toBe(element.id);
			// the not loaded element should not be loaded
			expect(find(childrenNodes, (item) => item?.id === notLoadedElement.id)).not.toBeDefined();

			// rename element to put it as first
			element.name = (childrenNodes[0] as Node).name.substring(
				0,
				(childrenNodes[0] as Node).name.length - 1
			);

			newPos = addNodeInSortedList(childrenNodes, element, sort);

			addNodeToFolder({ ...folder }, element);

			const {
				children: { nodes: childrenNodes2 }
			} = readGetChildrenQuery(folder.id, sort);
			expect(childrenNodes2).toHaveLength(NODES_LOAD_LIMIT + 1);
			// created element should be at first position in the list
			expect(childrenNodes2[newPos]?.id).toBe(element.id);

			// rename again to move it as last element
			element.name = `${(childrenNodes2[childrenNodes2.length - 1] as Node).name}-last`;
			newPos = addNodeInSortedList(childrenNodes2, element, sort);
			newPos = newPos > -1 ? newPos : childrenNodes2.length;
			// call the hook saying that there are more children to load
			addNodeToFolder({ ...folder }, element);
			const {
				children: { nodes: childrenNodes3 }
			} = readGetChildrenQuery(folder.id, sort);

			expect(childrenNodes3).toHaveLength(NODES_LOAD_LIMIT + 1);
			// created element should be at last position in the list (new pos - 1 because it is removed from the top)
			expect(childrenNodes3[newPos - 1]?.id).toBe(element.id);
		});

		it('should update the list with some unordered items correctly when an already existing unordered item was updated', async () => {
			const folder = populateFolder(NODES_LOAD_LIMIT + 2);
			const sort = NODES_SORT_DEFAULT;
			// extract the last 2 elements that will be added after
			const last = folder.children.nodes.splice(folder.children.nodes.length - 1, 1)[0] as Node;
			const secondLastNode = folder.children.nodes.splice(
				folder.children.nodes.length - 1,
				1
			)[0] as Node;
			// we need to be sure that it is a file
			const secondLast = populateFile(secondLastNode.id, secondLastNode.name);

			prepareCache(folder);

			let newPos = addNodeInSortedList(folder.children.nodes, secondLast, sort);
			expect(newPos).toBe(-1);

			const { addNodeToFolder } = setupHook<
				Parameters<typeof useUpdateFolderContent>[number],
				UpdateFolderContentType
			>(useUpdateFolderContent).result.current;

			// add the secondLast item to the folder, it is out from ordered items, so it will be put in the unordered items
			addNodeToFolder(folder, secondLast);
			const {
				children: { nodes: childrenNodes }
			} = readGetChildrenQuery(folder.id, sort);

			expect(childrenNodes).toHaveLength(NODES_LOAD_LIMIT + 1);
			// created element should be at last position in the list
			expect(childrenNodes[childrenNodes.length - 1]?.id).toBe(secondLast.id);

			newPos = addNodeInSortedList(childrenNodes, last, sort);
			expect(newPos).toBe(-1);

			// add the last item to the folder, it is out from ordered items, so it will be put in the unordered items
			addNodeToFolder({ ...folder }, last);

			const {
				children: { nodes: childrenNodes2 }
			} = readGetChildrenQuery(folder.id, sort);
			expect(childrenNodes2).toHaveLength(NODES_LOAD_LIMIT + 2);
			// created element should be at last position in the list
			expect(childrenNodes2[childrenNodes2.length - 1]?.id).toBe(last.id);

			// simulate upload version of already existing file
			secondLast.size += 10000;

			// addNodeInSortedList function return the idx + 1 of the already inserted item
			newPos = addNodeInSortedList(childrenNodes2, secondLast, sort);
			expect(newPos).toBe(childrenNodes2.length - 1);

			addNodeToFolder({ ...folder }, secondLast);

			const {
				children: { nodes: childrenNodes3 }
			} = readGetChildrenQuery(folder.id, sort);
			// updated element should not increment the size
			expect(childrenNodes3).toHaveLength(NODES_LOAD_LIMIT + 2);
			// secondLast element should remain the second last element if current sorting criteria is not afflicted
			expect(childrenNodes3[childrenNodes3.length - 2]?.id).toBe(secondLast.id);
		});
	});
});
