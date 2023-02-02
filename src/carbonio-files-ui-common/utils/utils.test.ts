/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';

import { populateFile, populateFolder, populateLocalRoot, populateNodes } from '../mocks/mockUtils';
import { NodeSort } from '../types/graphql/types';
import { addNodeInSortedList, buildCrumbs, cssCalcBuilder } from './utils';

describe('Crumbs builder', () => {
	it('should return a flat array with 3 objects ordered from root to leaf', () => {
		const lvl0 = populateLocalRoot(0);
		const lvl1 = populateFolder();
		const lvl2 = populateFolder();
		lvl2.parent = lvl1;
		lvl1.parent = lvl0;

		const resultWithNode = buildCrumbs(lvl2);
		const resultWithArray = buildCrumbs([lvl0, lvl1, lvl2]);

		const expected = [
			{
				id: lvl0.id,
				label: lvl0.name
			},
			{
				id: lvl1.id,
				label: lvl1.name
			},
			{
				id: lvl2.id,
				label: lvl2.name
			}
		];

		expect(resultWithNode).toMatchObject(expected);
		expect(resultWithArray).toMatchObject(expected);
	});
});

describe('Sort algorithm', () => {
	it('should put folder before files', () => {
		const files = populateNodes(3, 'File');
		const folder = populateFolder(0, undefined, `${files[2].name}-last folder`);
		let position = addNodeInSortedList(files, folder, NodeSort.NameAsc);
		expect(position).toBe(0);
		position = addNodeInSortedList(files, folder, NodeSort.NameDesc);
		expect(position).toBe(0);
		position = addNodeInSortedList(files, folder, NodeSort.UpdatedAtAsc);
		expect(position).toBe(0);
		position = addNodeInSortedList(files, folder, NodeSort.UpdatedAtDesc);
		expect(position).toBe(0);
	});

	it('should put folder after files if sorting for size desc, before them if sorting for size asc', () => {
		const files = populateNodes(3, 'File');
		const folder = populateFolder(0, undefined, `${files[0].name}-last folder`);
		let position = addNodeInSortedList(files, folder, NodeSort.SizeDesc);
		expect(position).toBe(-1);
		position = addNodeInSortedList(files, folder, NodeSort.SizeAsc);
		expect(position).toBe(0);
	});

	it('should put file after folders', () => {
		const folders = populateNodes(3, 'Folder');
		const file = populateFile(undefined, folders[0].name.substring(0, folders[0].name.length - 1));
		let position = addNodeInSortedList(folders, file, NodeSort.NameAsc);
		expect(position).toBe(-1);
		position = addNodeInSortedList(folders, file, NodeSort.NameDesc);
		expect(position).toBe(-1);
		position = addNodeInSortedList(folders, file, NodeSort.UpdatedAtAsc);
		expect(position).toBe(-1);
		position = addNodeInSortedList(folders, file, NodeSort.UpdatedAtDesc);
		expect(position).toBe(-1);
	});

	it('should put files before folders if sorting for size desc, after them if sorting for size asc', () => {
		const folders = populateNodes(3, 'Folder');
		const file = populateFile(undefined, `${folders[2].name}-last file`);
		let position = addNodeInSortedList(folders, file, NodeSort.SizeDesc);
		expect(position).toBe(0);
		position = addNodeInSortedList(folders, file, NodeSort.SizeAsc);
		expect(position).toBe(-1);
	});

	it('should put node in its ordered position between same type of nodes (asc order)', () => {
		const nodes = [
			populateFolder(0, undefined, 'folder1'),
			populateFolder(0, undefined, 'folder3'),
			populateFolder(0, undefined, 'folder4'),
			populateFolder(0, undefined, 'folder5'),
			populateFile(undefined, 'file1'),
			populateFile(undefined, 'file2'),
			populateFile(undefined, 'file4'),
			populateFile(undefined, 'file5')
		];
		const folderToAdd = populateFolder(0, undefined, 'folder2');
		const fileToAdd = populateFile(undefined, 'file3');

		const folderPos = addNodeInSortedList(nodes, folderToAdd, NodeSort.NameAsc);
		expect(folderPos).toBe(1);
		const filePos = addNodeInSortedList(nodes, fileToAdd, NodeSort.NameAsc);
		expect(filePos).toBe(6);
	});

	it('should put node in its ordered position between same type of nodes (desc order)', () => {
		const nodes = [
			populateFolder(0, undefined, 'folder5'),
			populateFolder(0, undefined, 'folder4'),
			populateFolder(0, undefined, 'folder3'),
			populateFolder(0, undefined, 'folder1'),
			populateFile(undefined, 'file5'),
			populateFile(undefined, 'file4'),
			populateFile(undefined, 'file2'),
			populateFile(undefined, 'file1')
		];
		const folderToAdd = populateFolder(0, undefined, 'folder2');
		const fileToAdd = populateFile(undefined, 'file3');

		const folderPos = addNodeInSortedList(nodes, folderToAdd, NodeSort.NameDesc);
		expect(folderPos).toBe(3);
		const filePos = addNodeInSortedList(nodes, fileToAdd, NodeSort.NameDesc);
		expect(filePos).toBe(6);
	});

	it('should compare names with case insensitive', () => {
		const nodes = [
			populateFolder(0, undefined, 'folder5'),
			populateFolder(0, undefined, 'folder4'),
			populateFolder(0, undefined, 'folder3'),
			populateFolder(0, undefined, 'folder1'),
			populateFile(undefined, 'file5'),
			populateFile(undefined, 'file4'),
			populateFile(undefined, 'file2'),
			populateFile(undefined, 'file1')
		];
		const folderToAdd = populateFolder(0, undefined, 'FOLDER2');
		const fileToAdd = populateFile(undefined, 'FILE3');

		const folderPos = addNodeInSortedList(nodes, folderToAdd, NodeSort.NameDesc);
		expect(folderPos).toBe(3);
		const filePos = addNodeInSortedList(nodes, fileToAdd, NodeSort.NameDesc);
		expect(filePos).toBe(6);
	});
});

describe('CssCalc builder', () => {
	type OperationTuple = Parameters<typeof cssCalcBuilder>[1];
	type OperationOperator = OperationTuple[0];

	it('should return the first value as string if only first value is provided', () => {
		const args: Parameters<typeof cssCalcBuilder> = [10];
		const expected = `${args[0]}`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});

	it('should return a calc with only the first value if operations are empty', () => {
		const operation = [] as unknown as OperationTuple;
		const args: Parameters<typeof cssCalcBuilder> = [10, operation, operation];
		const expected = `calc(${args[0]})`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});

	it('should return a calc with only the first value if operations are incomplete', () => {
		const operation1 = ['/', ''] as unknown as OperationTuple;
		const operation2 = [undefined, '20px'] as unknown as OperationTuple;
		const args: Parameters<typeof cssCalcBuilder> = [10, operation1, operation2];
		const expected = `calc(${args[0]})`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});

	test('should return a calc between the first value and the value of the operation, with the given operator, if only one operation is provided', () => {
		const operation: OperationTuple = ['+', 5];
		const args: Parameters<typeof cssCalcBuilder> = [10, operation];
		const expected = `calc(${args[0]} ${operation[0]} ${operation[1]})`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});

	test('should return a calc between the first value and the value of the operation, with the given operator, if the operation value is 0', () => {
		const operation: OperationTuple = ['+', 0];
		const args: Parameters<typeof cssCalcBuilder> = [-10, operation];
		const expected = `calc(${args[0]} ${operation[0]} ${operation[1]})`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});

	test('should return a calc between the first value and the concatenation of the operations if two operations are provided', () => {
		const operation1: OperationTuple = ['+', -5];
		const operation2: OperationTuple = ['/', 20];
		const args: Parameters<typeof cssCalcBuilder> = [10, operation1, operation2];
		const expected = `calc(${args[0]} ${operation1[0]} ${operation1[1]} ${operation2[0]} ${operation2[1]})`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});

	test('should return a calc between the first value and the concatenation of the operations if more then two operations are provided', () => {
		const operations: OperationTuple[] = [];
		for (let i = 0; i < 10; i += 1) {
			const operator = faker.helpers.arrayElement<OperationOperator>(['+', '-', '*', '/']);
			operations.push([operator, i]);
		}
		const expectedOperations = operations.flat(2).join(' ');

		const args: Parameters<typeof cssCalcBuilder> = [10, ...operations];
		const expected = `calc(${args[0]} ${expectedOperations})`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});

	it('should handle well strings for values', () => {
		const operation: OperationTuple = ['*', '5%'];
		const args: Parameters<typeof cssCalcBuilder> = ['10rem', operation];
		const expected = `calc(${args[0]} ${operation[0]} ${operation[1]})`;
		const result = cssCalcBuilder(...args);
		expect(result).toBe(expected);
	});
});
