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
	canRename,
	canUnFlag
} from './ActionsFactory';
import { docsHandledMimeTypes, isFile, isFolder } from './utils';
import { LOGGED_USER } from '../../mocks/constants';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNode,
	populateUnknownNode,
	populateUser
} from '../mocks/mockUtils';
import { Node } from '../types/common';
import { File, Folder } from '../types/graphql/types';

type NodeWithoutPermission<T extends Node> = Omit<T, 'permissions'> & {
	permissions: Partial<T['permissions']>;
};

describe('ActionsFactory', () => {
	describe('isFile', () => {
		it('should return false on a Folder', () => {
			const testFolder = populateFolder();
			expect(isFile(testFolder)).toBeFalsy();
		});
		it('should return true on a File', () => {
			const testFile = populateFile();
			expect(isFile(testFile)).toBeTruthy();
		});

		it('should return false on a UnknownType', () => {
			const testUnknownType = populateUnknownNode();
			expect(isFile(testUnknownType)).toBeFalsy();
		});
	});

	describe('isFolder', () => {
		it('should return true on a Folder', () => {
			const testFolder = populateFolder();
			expect(isFolder(testFolder)).toBeTruthy();
		});
		it('should return false on a File', () => {
			const testFile = populateFile();
			expect(isFolder(testFile)).toBeFalsy();
		});

		it('should return false on a UnknownType', () => {
			const testUnknownType = populateUnknownNode();
			expect(isFolder(testUnknownType)).toBeFalsy();
		});
	});

	describe('canRename', () => {
		it('cannot evaluate canRename on Node type', () => {
			const testFolder: Folder = populateFolder();
			const canRenameWrapper: () => boolean = () => canRename({ nodes: testFolder });
			expect(canRenameWrapper).toThrow('cannot evaluate canRename on Node type');
		});

		it('cannot evaluate canRename on empty nodes array', () => {
			const canRenameWrapper: () => boolean = () => canRename({ nodes: [] });
			expect(canRenameWrapper).toThrow('cannot evaluate canRename on empty nodes array');
		});

		it('cannot rename more than one node', () => {
			const testFolder1: Folder = populateFolder();
			const testFolder2: Folder = populateFolder();
			expect(canRename({ nodes: [testFolder1, testFolder2] })).toBeFalsy();
		});

		it('on Folder depend on can_write_folder value', () => {
			const testFolder1: Folder = populateFolder();
			testFolder1.permissions.can_write_folder = true;
			expect(canRename({ nodes: [testFolder1] })).toBeTruthy();
			testFolder1.permissions.can_write_folder = false;
			expect(canRename({ nodes: [testFolder1] })).toBeFalsy();
		});

		it('on File depend on can_write_file value', () => {
			const testFile: File = populateFile();
			testFile.permissions.can_write_file = true;
			expect(canRename({ nodes: [testFile] })).toBeTruthy();
			testFile.permissions.can_write_file = false;
			expect(canRename({ nodes: [testFile] })).toBeFalsy();
		});

		it('cannot evaluate canRename on UnknownType', () => {
			const testUnknownType = populateUnknownNode();
			const canRenameWrapper: () => boolean = () => canRename({ nodes: [testUnknownType] });
			expect(canRenameWrapper).toThrow('cannot evaluate canRename on UnknownType');
		});

		it('can_write_file not defined', () => {
			const testFile: NodeWithoutPermission<File> = populateFile();
			testFile.permissions.can_write_file = undefined;
			const canRenameWrapper: () => boolean = () => canRename({ nodes: [testFile as File] });
			expect(canRenameWrapper).toThrow('can_write_file not defined');
		});

		it('can_write_folder not defined', () => {
			const testFolder: NodeWithoutPermission<Folder> = populateFolder();
			testFolder.permissions.can_write_folder = undefined;
			const canRenameWrapper: () => boolean = () => canRename({ nodes: [testFolder as Folder] });
			expect(canRenameWrapper).toThrow('can_write_folder not defined');
		});
	});

	describe('canFlag', () => {
		it('cannot evaluate canFlag on Node type', () => {
			const testFolder: Folder = populateFolder();
			const canFlagWrapper: () => boolean = () => canFlag({ nodes: testFolder });
			expect(canFlagWrapper).toThrow('cannot evaluate canFlag on Node type');
		});

		it('cannot evaluate canFlag on empty nodes array', () => {
			const canFlagWrapper: () => boolean = () => canFlag({ nodes: [] });
			expect(canFlagWrapper).toThrow('cannot evaluate canFlag on empty nodes array');
		});

		it('return true when applied to an array bigger than 1 with at least 1 unflagged node (flagged item will be re-flagged)', () => {
			const testFolder: Folder = populateFolder();
			const testFile: File = populateFile();
			testFile.flagged = false;
			expect(canFlag({ nodes: [testFile, testFolder] })).toBeTruthy();
		});

		it('return false when applied to an array bigger than 1 with no unflagged nodes', () => {
			const testFolder: Folder = populateFolder();
			const testFile: File = populateFile();
			testFolder.flagged = true;
			testFile.flagged = true;
			expect(canFlag({ nodes: [testFile, testFolder] })).toBeFalsy();
		});

		it('return true if un-flagged, false otherwise', () => {
			const testFolder: Folder = populateFolder();
			testFolder.flagged = true;
			expect(canFlag({ nodes: [testFolder] })).toBeFalsy();
			testFolder.flagged = false;
			expect(canFlag({ nodes: [testFolder] })).toBeTruthy();
		});
	});

	describe('canUnFlag', () => {
		it('cannot evaluate canUnFlag on Node type', () => {
			const testFolder: Folder = populateFolder();
			const canUnFlagWrapper: () => boolean = () => canUnFlag({ nodes: testFolder });
			expect(canUnFlagWrapper).toThrow('cannot evaluate canUnFlag on Node type');
		});

		it('cannot evaluate canUnFlag on empty nodes array', () => {
			const canUnFlagWrapper: () => boolean = () => canUnFlag({ nodes: [] });
			expect(canUnFlagWrapper).toThrow('cannot evaluate canUnFlag on empty nodes array');
		});

		it('return true when applied to an array bigger than 1 with at least 1 flagged node (un-flagged item will be re-un-flagged)', () => {
			const testFolder: Folder = populateFolder();
			const testFile: File = populateFile();
			testFile.flagged = true;
			expect(canUnFlag({ nodes: [testFile, testFolder] })).toBeTruthy();
		});

		it('return false when applied to an array bigger than 1 with no flagged nodes', () => {
			const testFolder: Folder = populateFolder();
			const testFile: File = populateFile();
			testFolder.flagged = false;
			testFile.flagged = false;
			expect(canUnFlag({ nodes: [testFile, testFolder] })).toBeFalsy();
		});

		it('return true if flagged, false otherwise', () => {
			const testFolder: Folder = populateFolder();
			testFolder.flagged = true;
			expect(canUnFlag({ nodes: [testFolder] })).toBeTruthy();
			testFolder.flagged = false;
			expect(canUnFlag({ nodes: [testFolder] })).toBeFalsy();
		});
	});

	describe('canCreateFolder', () => {
		it('destinationNode must be a Folder', () => {
			const testFile: File = populateFile();
			const canCreateFolderWrapper: () => boolean = () => canCreateFolder(testFile);
			expect(canCreateFolderWrapper).toThrow('destinationNode must be a Folder');
		});

		it('can_write_folder not defined', () => {
			const testFolder: NodeWithoutPermission<Folder> = populateFolder();
			testFolder.permissions.can_write_folder = undefined;
			const canCreateFolderWrapper: () => boolean = () => canCreateFolder(testFolder as Folder);
			expect(canCreateFolderWrapper).toThrow('can_write_folder not defined');
		});

		it('return true or false based on can_write_folder permission', () => {
			const testFolder: NodeWithoutPermission<Folder> = populateFolder();
			testFolder.permissions.can_write_folder = false;
			expect(canCreateFolder(testFolder as Folder)).toBeFalsy();
			testFolder.permissions.can_write_folder = true;
			expect(canCreateFolder(testFolder as Folder)).toBeTruthy();
		});
	});

	describe('canMarkForDeletion', () => {
		it('cannot evaluate canMarkForDeletion on UnknownType', () => {
			const testUnknownType = populateUnknownNode();
			const canMarkForDeletionWrapper: () => boolean = () =>
				canMarkForDeletion({ nodes: [testUnknownType] });
			expect(canMarkForDeletionWrapper).toThrow(
				'cannot evaluate canMarkForDeletion on UnknownType'
			);
		});

		it('can_write_file not defined', () => {
			const testFile: NodeWithoutPermission<File> = populateFile();
			testFile.permissions.can_write_file = undefined;
			const canMarkForDeletionWrapper: () => boolean = () =>
				canMarkForDeletion({ nodes: [testFile as File] });
			expect(canMarkForDeletionWrapper).toThrow('can_write_file not defined');
		});

		it('can_write_folder not defined', () => {
			const testFolder: NodeWithoutPermission<Folder> = populateFolder();
			testFolder.permissions.can_write_folder = undefined;
			const canMarkForDeletionWrapper: () => boolean = () =>
				canMarkForDeletion({ nodes: [testFolder as Folder] });
			expect(canMarkForDeletionWrapper).toThrow('can_write_folder not defined');
		});

		it('canMarkForDeletion on Folder depend on can_write_file value', () => {
			const testFolder: Folder = populateFolder();
			testFolder.permissions.can_write_folder = false;
			expect(canMarkForDeletion({ nodes: testFolder })).toBeFalsy();
			testFolder.permissions.can_write_folder = true;
			expect(canMarkForDeletion({ nodes: testFolder })).toBeTruthy();
		});

		it('canMarkForDeletion on File depend on can_write_file value', () => {
			const testFile: File = populateFile();
			testFile.permissions.can_write_file = true;
			expect(canMarkForDeletion({ nodes: [testFile] })).toBeTruthy();
			testFile.permissions.can_write_file = false;
			expect(canMarkForDeletion({ nodes: [testFile] })).toBeFalsy();
		});

		it('canMarkForDeletion on Array return true if all nodes return true', () => {
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
	});

	describe('canMove', () => {
		it('cannot evaluate on Node type', () => {
			const testFolder: Folder = populateFolder();
			const canMoveWrapper: () => boolean = () => canMove({ nodes: testFolder });
			expect(canMoveWrapper).toThrow('cannot evaluate canMove on Node type');
		});

		it('cannot evaluate on empty nodes array', () => {
			const canMoveWrapper: () => boolean = () => canMove({ nodes: [] });
			expect(canMoveWrapper).toThrow('cannot evaluate canMove on empty nodes array');
		});

		describe('on Folder', () => {
			it('should return true if folder has can_write_folder true and parent has can_write_folder true', () => {
				const testFolder1: Folder = populateFolder();
				const parent = populateFolder();
				testFolder1.permissions.can_write_folder = true;
				testFolder1.parent = parent;
				parent.permissions.can_write_folder = true;
				expect(canMove({ nodes: [testFolder1] })).toBeTruthy();
			});

			it('should return false if folder has can_write_folder false and parent has can_write_folder true', () => {
				const testFolder1: Folder = populateFolder();
				const parent = populateFolder();
				testFolder1.permissions.can_write_folder = true;
				testFolder1.parent = parent;
				testFolder1.permissions.can_write_folder = false;
				expect(canMove({ nodes: [testFolder1] })).toBeFalsy();
			});

			it('should return false if folder has can_write_folder true and parent null', () => {
				const testFolder1: Folder = populateFolder();
				testFolder1.permissions.can_write_folder = true;
				testFolder1.parent = null;
				expect(canMove({ nodes: [testFolder1] })).toBeFalsy();
			});

			it('should return false if folder has can_write_folder true and parent has can_write_folder false', () => {
				const testFolder1: Folder = populateFolder();
				const parent = populateFolder();
				testFolder1.permissions.can_write_folder = true;
				testFolder1.parent = parent;
				parent.permissions.can_write_folder = false;
				expect(canMove({ nodes: [testFolder1] })).toBeFalsy();
			});
		});

		describe('on File', () => {
			it('should return true if file has can_write_file true and parent has can_write_file true', () => {
				const testFile: File = populateFile();
				const parent = populateFolder();
				testFile.permissions.can_write_file = true;
				parent.permissions.can_write_file = true;
				testFile.parent = parent;
				expect(canMove({ nodes: [testFile] })).toBeTruthy();
			});

			it('should return false if file has can_write_file false and parent has can_write_file true', () => {
				const testFile: File = populateFile();
				const parent = populateFolder();
				testFile.permissions.can_write_file = false;
				parent.permissions.can_write_file = true;
				testFile.parent = parent;
				expect(canMove({ nodes: [testFile] })).toBeFalsy();
			});

			it('should return false if file has can_write_file true and parent has can_write_file false', () => {
				const testFile: File = populateFile();
				const parent = populateFolder();
				testFile.permissions.can_write_file = true;
				parent.permissions.can_write_file = false;
				testFile.parent = parent;
				expect(canMove({ nodes: [testFile] })).toBeFalsy();
			});

			it('should return false if file has can_write_file true and parent null', () => {
				const testFile: File = populateFile();
				testFile.permissions.can_write_file = true;
				testFile.parent = null;
				expect(canMove({ nodes: [testFile] })).toBeFalsy();
			});
		});

		it('cannot evaluate on UnknownType', () => {
			const testUnknownType = populateUnknownNode();
			const canMoveWrapper: () => boolean = () => canMove({ nodes: [testUnknownType] });
			expect(canMoveWrapper).toThrow('cannot evaluate canMove on UnknownType');
		});

		it('can_write_file not defined', () => {
			const testFile: NodeWithoutPermission<File> = populateFile();
			testFile.permissions.can_write_file = undefined;
			const canMoveWrapper: () => boolean = () => canMove({ nodes: [testFile as File] });
			expect(canMoveWrapper).toThrow('can_write_file not defined');
		});

		it('can_write_folder not defined', () => {
			const testFolder: NodeWithoutPermission<Folder> = populateFolder();
			testFolder.permissions.can_write_folder = undefined;
			const canMoveWrapper: () => boolean = () => canMove({ nodes: [testFolder as Folder] });
			expect(canMoveWrapper).toThrow('can_write_folder not defined');
		});

		it('should return false if node is a direct share with me (parent is LOCAL_ROOT and owner is not logged user)', () => {
			const testNode = populateNode();
			testNode.permissions.can_write_folder = true;
			testNode.permissions.can_write_file = true;
			testNode.parent = populateLocalRoot();
			testNode.owner = populateUser();
			expect(canMove({ nodes: [testNode] })).toBeFalsy();
		});

		it('should return true if node is owned by logged user', () => {
			const testNode = populateNode();
			testNode.permissions.can_write_folder = true;
			testNode.permissions.can_write_file = true;
			testNode.parent = populateLocalRoot();
			testNode.owner = populateUser(LOGGED_USER.id);
			expect(canMove({ nodes: [testNode] })).toBeTruthy();
		});
	});

	describe('canCopy', () => {
		it('cannot evaluate canCopy on Node type', () => {
			const testFolder: Folder = populateFolder();
			const canCopyWrapper: () => boolean = () => canCopy({ nodes: testFolder });
			expect(canCopyWrapper).toThrow('cannot evaluate canCopy on Node type');
		});

		it('cannot evaluate canCopy on empty nodes array', () => {
			const canCopyWrapper: () => boolean = () => canCopy({ nodes: [] });
			expect(canCopyWrapper).toThrow('cannot evaluate canCopy on empty nodes array');
		});

		it('canCopy on File/Folder is always allowed', () => {
			const testFile: File = populateFile();
			expect(canCopy({ nodes: [testFile] })).toBeTruthy();
			const testFolder: Folder = populateFolder();
			expect(canCopy({ nodes: [testFolder] })).toBeTruthy();
		});
	});

	describe('canOpenVersionWithDocs', () => {
		it('return true when canUseDocs is true and others criteria are valid', () => {
			const testFile: File = populateFile();
			[testFile.mime_type] = docsHandledMimeTypes;
			expect(canOpenVersionWithDocs({ nodes: [testFile], canUseDocs: true })).toBeTruthy();
		});

		it('return false when canUseDocs is false and others criteria are valid', () => {
			const testFile: File = populateFile();
			[testFile.mime_type] = docsHandledMimeTypes;
			expect(canOpenVersionWithDocs({ nodes: [testFile], canUseDocs: false })).toBeFalsy();
		});
	});
});
