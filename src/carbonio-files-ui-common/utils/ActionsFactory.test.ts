/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
	canCopy,
	canCreateFolder,
	canFlag,
	canMarkForDeletion,
	canMove,
	canOpenVersionWithDocs,
	canPreview,
	canRename,
	canUnFlag
} from './ActionsFactory';
import { docsHandledMimeTypes, isFile, isFolder } from './utils';
import { ROOTS } from '../constants';
import { populateFile, populateFolder, populateUnknownNode } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { File, Folder } from '../types/graphql/types';

type NodeWithoutPermission<T extends Node> = Omit<T, 'permissions'> & {
	permissions: Partial<T['permissions']>;
};

describe('ActionsFactory test', () => {
	/**
	 *  isFile
	 *
	 * */
	it('isFile: return false on a Folder', () => {
		const testFolder = populateFolder();
		expect(isFile(testFolder)).toBeFalsy();
	});
	it('isFile: return true on a File', () => {
		const testFile = populateFile();
		expect(isFile(testFile)).toBeTruthy();
	});

	it('isFile: return false on a UnknownType', () => {
		const testUnknownType = populateUnknownNode();
		expect(isFile(testUnknownType)).toBeFalsy();
	});

	/**
	 *  isFolder
	 *
	 * */
	it('isFolder: return true on a Folder', () => {
		const testFolder = populateFolder();
		expect(isFolder(testFolder)).toBeTruthy();
	});
	it('isFolder: return false on a File', () => {
		const testFile = populateFile();
		expect(isFolder(testFile)).toBeFalsy();
	});

	it('isFolder: return false on a UnknownType', () => {
		const testUnknownType = populateUnknownNode();
		expect(isFolder(testUnknownType)).toBeFalsy();
	});

	/**
	 *  canRename
	 *
	 * */
	// https://stackoverflow.com/questions/46042613/how-to-test-the-type-of-a-thrown-exception-in-jest/58103698#58103698
	it('canRename: cannot evaluate canRename on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canRenameWrapper: () => boolean = () => canRename({ nodes: testFolder });
		expect(canRenameWrapper).toThrow('cannot evaluate canRename on Node type');
	});

	it('canRename: cannot evaluate canRename on empty nodes array', () => {
		const canRenameWrapper: () => boolean = () => canRename({ nodes: [] });
		expect(canRenameWrapper).toThrow('cannot evaluate canRename on empty nodes array');
	});

	it('canRename: cannot rename more than one node', () => {
		const testFolder1: Folder = populateFolder();
		const testFolder2: Folder = populateFolder();
		expect(canRename({ nodes: [testFolder1, testFolder2] })).toBeFalsy();
	});

	it('canRename: canRename on Folder depend on can_write_folder value', () => {
		const testFolder1: Folder = populateFolder();
		testFolder1.permissions.can_write_folder = true;
		expect(canRename({ nodes: [testFolder1] })).toBeTruthy();
		testFolder1.permissions.can_write_folder = false;
		expect(canRename({ nodes: [testFolder1] })).toBeFalsy();
	});

	it('canRename: canRename on File depend on can_write_file value', () => {
		const testFile: File = populateFile();
		testFile.permissions.can_write_file = true;
		expect(canRename({ nodes: [testFile] })).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canRename({ nodes: [testFile] })).toBeFalsy();
	});

	it('canRename: cannot evaluate canRename on UnknownType', () => {
		const testUnknownType = populateUnknownNode();
		const canRenameWrapper: () => boolean = () => canRename({ nodes: [testUnknownType] });
		expect(canRenameWrapper).toThrow('cannot evaluate canRename on UnknownType');
	});

	it('canRename: can_write_file not defined', () => {
		const testFile: NodeWithoutPermission<File> = populateFile();
		testFile.permissions.can_write_file = undefined;
		const canRenameWrapper: () => boolean = () => canRename({ nodes: [testFile as File] });
		expect(canRenameWrapper).toThrow('can_write_file not defined');
	});

	it('canRename: can_write_folder not defined', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = undefined;
		const canRenameWrapper: () => boolean = () => canRename({ nodes: [testFolder as Folder] });
		expect(canRenameWrapper).toThrow('can_write_folder not defined');
	});

	/**
	 *  canFlag
	 *
	 * */
	it('canFlag: cannot evaluate canFlag on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canFlagWrapper: () => boolean = () => canFlag({ nodes: testFolder });
		expect(canFlagWrapper).toThrow('cannot evaluate canFlag on Node type');
	});

	it('canFlag: cannot evaluate canFlag on empty nodes array', () => {
		const canFlagWrapper: () => boolean = () => canFlag({ nodes: [] });
		expect(canFlagWrapper).toThrow('cannot evaluate canFlag on empty nodes array');
	});

	it('canFlag: return true when applied to an array bigger than 1 with at least 1 unflagged node (flagged item will be re-flagged)', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFile.flagged = false;
		expect(canFlag({ nodes: [testFile, testFolder] })).toBeTruthy();
	});

	it('canFlag: return false when applied to an array bigger than 1 with no unflagged nodes', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFolder.flagged = true;
		testFile.flagged = true;
		expect(canFlag({ nodes: [testFile, testFolder] })).toBeFalsy();
	});

	it('canFlag: return true if un-flagged, false otherwise', () => {
		const testFolder: Folder = populateFolder();
		testFolder.flagged = true;
		expect(canFlag({ nodes: [testFolder] })).toBeFalsy();
		testFolder.flagged = false;
		expect(canFlag({ nodes: [testFolder] })).toBeTruthy();
	});

	/**
	 *  canUnFlag
	 *
	 * */
	it('canUnFlag: cannot evaluate canUnFlag on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canUnFlagWrapper: () => boolean = () => canUnFlag({ nodes: testFolder });
		expect(canUnFlagWrapper).toThrow('cannot evaluate canUnFlag on Node type');
	});

	it('canUnFlag: cannot evaluate canUnFlag on empty nodes array', () => {
		const canUnFlagWrapper: () => boolean = () => canUnFlag({ nodes: [] });
		expect(canUnFlagWrapper).toThrow('cannot evaluate canUnFlag on empty nodes array');
	});

	it('canUnFlag: return true when applied to an array bigger than 1 with at least 1 flagged node (un-flagged item will be re-un-flagged)', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFile.flagged = true;
		expect(canUnFlag({ nodes: [testFile, testFolder] })).toBeTruthy();
	});

	it('canUnFlag: return false when applied to an array bigger than 1 with no flagged nodes', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFolder.flagged = false;
		testFile.flagged = false;
		expect(canUnFlag({ nodes: [testFile, testFolder] })).toBeFalsy();
	});

	it('canUnFlag: return true if flagged, false otherwise', () => {
		const testFolder: Folder = populateFolder();
		testFolder.flagged = true;
		expect(canUnFlag({ nodes: [testFolder] })).toBeTruthy();
		testFolder.flagged = false;
		expect(canUnFlag({ nodes: [testFolder] })).toBeFalsy();
	});

	/**
	 *  canCreateFolder
	 *
	 * */

	it('canCreateFolder: destinationNode must be a Folder', () => {
		const testFile: File = populateFile();
		const canCreateFolderWrapper: () => boolean = () => canCreateFolder(testFile);
		expect(canCreateFolderWrapper).toThrow('destinationNode must be a Folder');
	});

	it('canCreateFolder: can_write_folder not defined', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = undefined;
		const canCreateFolderWrapper: () => boolean = () => canCreateFolder(testFolder as Folder);
		expect(canCreateFolderWrapper).toThrow('can_write_folder not defined');
	});

	it('canCreateFolder: return true or false based on can_write_folder permission', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = false;
		expect(canCreateFolder(testFolder as Folder)).toBeFalsy();
		testFolder.permissions.can_write_folder = true;
		expect(canCreateFolder(testFolder as Folder)).toBeTruthy();
	});

	/**
	 *  canMarkForDeletion
	 *
	 * */

	it('canMarkForDeletion: cannot evaluate canMarkForDeletion on UnknownType', () => {
		const testUnknownType = populateUnknownNode();
		const canMarkForDeletionWrapper: () => boolean = () =>
			canMarkForDeletion({ nodes: [testUnknownType] });
		expect(canMarkForDeletionWrapper).toThrow('cannot evaluate canMarkForDeletion on UnknownType');
	});

	it('canMarkForDeletion: can_write_file not defined', () => {
		const testFile: NodeWithoutPermission<File> = populateFile();
		testFile.permissions.can_write_file = undefined;
		const canMarkForDeletionWrapper: () => boolean = () =>
			canMarkForDeletion({ nodes: [testFile as File] });
		expect(canMarkForDeletionWrapper).toThrow('can_write_file not defined');
	});

	it('canMarkForDeletion: can_write_folder not defined', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = undefined;
		const canMarkForDeletionWrapper: () => boolean = () =>
			canMarkForDeletion({ nodes: [testFolder as Folder] });
		expect(canMarkForDeletionWrapper).toThrow('can_write_folder not defined');
	});

	it('canMarkForDeletion: canMarkForDeletion on Folder depend on can_write_file value', () => {
		const testFolder: Folder = populateFolder();
		testFolder.permissions.can_write_folder = false;
		expect(canMarkForDeletion({ nodes: testFolder })).toBeFalsy();
		testFolder.permissions.can_write_folder = true;
		expect(canMarkForDeletion({ nodes: testFolder })).toBeTruthy();
	});

	it('canMarkForDeletion: canMarkForDeletion on File depend on can_write_file value', () => {
		const testFile: File = populateFile();
		testFile.permissions.can_write_file = true;
		expect(canMarkForDeletion({ nodes: [testFile] })).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canMarkForDeletion({ nodes: [testFile] })).toBeFalsy();
	});

	it('canMarkForDeletion: canMarkForDeletion on Array return true if all nodes return true', () => {
		const testFile: File = populateFile();
		const testFile2: File = populateFile();
		const testFolder: Folder = populateFolder();
		testFolder.permissions.can_write_folder = true;
		testFile.permissions.can_write_file = true;
		testFile2.permissions.can_write_file = true;
		expect(canMarkForDeletion({ nodes: [testFile, testFile2, testFolder] })).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canMarkForDeletion({ nodes: [testFile, testFile2, testFolder] })).toBeFalsy();
	});

	/**
	 *  canMove
	 *
	 * */
	it('canMove: cannot evaluate canMove on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canMoveWrapper: () => boolean = () => canMove({ nodes: testFolder });
		expect(canMoveWrapper).toThrow('cannot evaluate canMove on Node type');
	});

	it('canMove: cannot evaluate canMove on empty nodes array', () => {
		const canMoveWrapper: () => boolean = () => canMove({ nodes: [] });
		expect(canMoveWrapper).toThrow('cannot evaluate canMove on empty nodes array');
	});

	it('canMove: canMove on Folder depend on can_write_folder value of folder and parent', () => {
		const testFolder1: Folder = populateFolder();
		const parent = populateFolder();
		testFolder1.permissions.can_write_folder = true;
		testFolder1.parent = parent;
		parent.permissions.can_write_folder = true;
		expect(canMove({ nodes: [testFolder1] })).toBeTruthy();
		testFolder1.permissions.can_write_folder = false;
		expect(canMove({ nodes: [testFolder1] })).toBeFalsy();
		testFolder1.permissions.can_write_folder = true;
		testFolder1.parent = null;
		expect(canMove({ nodes: [testFolder1] })).toBeFalsy();
		testFolder1.parent = parent;
		parent.permissions.can_write_folder = false;
		expect(canMove({ nodes: [testFolder1] })).toBeFalsy();
	});

	it('canMove: canMove on File depend on can_write_file value of file and parent', () => {
		const testFile: File = populateFile();
		const parent = populateFolder();
		testFile.permissions.can_write_file = true;
		testFile.parent = parent;
		parent.permissions.can_write_file = true;
		expect(canMove({ nodes: [testFile] })).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canMove({ nodes: [testFile] })).toBeFalsy();
		testFile.permissions.can_write_file = true;
		testFile.parent = null;
		expect(canMove({ nodes: [testFile] })).toBeFalsy();
		testFile.parent = parent;
		parent.permissions.can_write_file = false;
		expect(canMove({ nodes: [testFile] })).toBeFalsy();
	});

	it('canMove: cannot evaluate canMove on UnknownType', () => {
		const testUnknownType = populateUnknownNode();
		const canMoveWrapper: () => boolean = () => canMove({ nodes: [testUnknownType] });
		expect(canMoveWrapper).toThrow('cannot evaluate canMove on UnknownType');
	});

	it('canMove: can_write_file not defined', () => {
		const testFile: NodeWithoutPermission<File> = populateFile();
		testFile.permissions.can_write_file = undefined;
		const canMoveWrapper: () => boolean = () => canMove({ nodes: [testFile as File] });
		expect(canMoveWrapper).toThrow('can_write_file not defined');
	});

	it('canMove: can_write_folder not defined', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = undefined;
		const canMoveWrapper: () => boolean = () => canMove({ nodes: [testFolder as Folder] });
		expect(canMoveWrapper).toThrow('can_write_folder not defined');
	});

	/**
	 *  canCopy
	 *
	 * */
	it('canCopy: cannot evaluate canCopy on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canCopyWrapper: () => boolean = () => canCopy({ nodes: testFolder });
		expect(canCopyWrapper).toThrow('cannot evaluate canCopy on Node type');
	});

	it('canCopy: cannot evaluate canCopy on empty nodes array', () => {
		const canCopyWrapper: () => boolean = () => canCopy({ nodes: [] });
		expect(canCopyWrapper).toThrow('cannot evaluate canCopy on empty nodes array');
	});

	it('canCopy: canCopy on File/Folder is always allowed', () => {
		const testFile: File = populateFile();
		expect(canCopy({ nodes: [testFile] })).toBeTruthy();
		const testFolder: Folder = populateFolder();
		expect(canCopy({ nodes: [testFolder] })).toBeTruthy();
	});

	/**
	 * canOpenVersionWithDocs
	 */

	it('canOpenVersionWithDocs return true when canUseDocs is true and others criteria are valid', () => {
		const testFile: File = populateFile();
		[testFile.mime_type] = docsHandledMimeTypes;
		expect(canOpenVersionWithDocs({ nodes: [testFile], canUseDocs: true })).toBeTruthy();
	});

	it('canOpenVersionWithDocs return false when canUseDocs is false and others criteria are valid', () => {
		const testFile: File = populateFile();
		[testFile.mime_type] = docsHandledMimeTypes;
		expect(canOpenVersionWithDocs({ nodes: [testFile], canUseDocs: false })).toBeFalsy();
	});

	describe('canPreview', () => {
		it('should throw cannot evaluate canPreview on empty nodes array when nodes are 0', () => {
			const canPreviewWrapper: () => boolean = () =>
				canPreview({
					nodes: [],
					canUseDocs: true,
					canUsePreview: true
				});

			expect(canPreviewWrapper).toThrow('cannot evaluate canPreview on empty nodes array');
		});

		it('should throw cannot evaluate canPreview on Node type when nodes is not an array', () => {
			const canPreviewWrapper: () => boolean = () =>
				canPreview({
					nodes: populateFile(),
					canUseDocs: true,
					canUsePreview: true
				});

			expect(canPreviewWrapper).toThrow('cannot evaluate canPreview on Node type');
		});

		it('should return false when nodes are more than 1', () => {
			expect(
				canPreview({
					nodes: [populateFile(), populateFile()],
					canUseDocs: true,
					canUsePreview: true
				})
			).toBeFalsy();
		});

		it('should return false when nodes are folder', () => {
			expect(
				canPreview({
					nodes: [populateFolder()],
					canUseDocs: true,
					canUsePreview: true
				})
			).toBeFalsy();
		});

		it('should return false when rootId is trash', () => {
			const testFile = populateFile();
			testFile.rootId = ROOTS.TRASH;
			expect(
				canPreview({
					nodes: [testFile],
					canUseDocs: true,
					canUsePreview: true
				})
			).toBeFalsy();
		});

		it.each([
			[true, 'application/msword', true, true],
			[true, 'application/vnd.ms-excel', true, true],
			[true, 'application/vnd.ms-powerpoint', true, true],
			[true, 'application/vnd.oasis.opendocument.presentation', true, true],
			[true, 'application/vnd.oasis.opendocument.spreadsheet', true, true],
			[true, 'application/vnd.oasis.opendocument.text', true, true],
			[
				true,
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				true,
				true
			],
			[true, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true, true],
			[true, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true, true],
			[true, 'image/svg+xml', true, true],
			[true, 'image/png', true, true],
			[true, 'application/pdf', true, true],
			[false, 'application/msword', false, false],
			[false, 'application/vnd.ms-excel', false, false],
			[false, 'application/vnd.ms-powerpoint', false, false],
			[false, 'application/vnd.oasis.opendocument.presentation', false, false],
			[false, 'application/vnd.oasis.opendocument.spreadsheet', false, false],
			[false, 'application/vnd.oasis.opendocument.text', false, false],
			[
				false,
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				false,
				false
			],
			[false, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false, false],
			[
				false,
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				false,
				false
			],
			[false, 'image/svg+xml', false, false],
			[false, 'image/png', false, false],
			[false, 'application/pdf', false, false],
			[false, 'application/msword', true, false],
			[false, 'application/vnd.ms-excel', true, false],
			[false, 'application/vnd.ms-powerpoint', true, false],
			[false, 'application/vnd.oasis.opendocument.presentation', true, false],
			[false, 'application/vnd.oasis.opendocument.spreadsheet', true, false],
			[false, 'application/vnd.oasis.opendocument.text', true, false],
			[
				false,
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				true,
				false
			],
			[false, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true, false],
			[
				false,
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				true,
				false
			],
			[true, 'image/svg+xml', true, false],
			[true, 'image/png', true, false],
			[true, 'application/pdf', true, false],
			[false, 'application/msword', false, true],
			[false, 'application/vnd.ms-excel', false, true],
			[false, 'application/vnd.ms-powerpoint', false, true],
			[false, 'application/vnd.oasis.opendocument.presentation', false, true],
			[false, 'application/vnd.oasis.opendocument.spreadsheet', false, true],
			[false, 'application/vnd.oasis.opendocument.text', false, true],
			[
				false,
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				false,
				true
			],
			[false, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false, true],
			[
				false,
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				false,
				true
			],
			[false, 'image/svg+xml', false, true],
			[false, 'image/png', false, true],
			[false, 'application/pdf', false, true]
		])(
			'should return %s when mime Type is %s, canUsePreview is %s and canUseDocs is %s',
			(expectedResult, mimeType, canUsePreview, canUseDocs) => {
				const testFile = populateFile();
				testFile.mime_type = mimeType;
				expect(canPreview({ nodes: [testFile], canUseDocs, canUsePreview })).toBe(expectedResult);
			}
		);

		it('should return false when canPlayType return ""', () => {
			jest.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('');
			const testFile = populateFile();
			expect(
				canPreview({ nodes: [testFile], canUseDocs: false, canUsePreview: false })
			).toBeFalsy();
		});

		it('should return true when canPlayType return maybe', () => {
			jest.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('maybe');
			const testFile = populateFile();
			expect(
				canPreview({ nodes: [testFile], canUseDocs: false, canUsePreview: false })
			).toBeTruthy();
		});

		it('should return true when canPlayType return probably', () => {
			jest.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('probably');
			const testFile = populateFile();
			expect(
				canPreview({ nodes: [testFile], canUseDocs: false, canUsePreview: false })
			).toBeTruthy();
		});
	});
});
