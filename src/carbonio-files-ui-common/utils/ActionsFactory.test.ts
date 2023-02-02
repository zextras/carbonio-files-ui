/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { populateFile, populateFolder, populateUnknownNode } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { File, Folder } from '../types/graphql/types';
import {
	canCopy,
	canCreateFolder,
	canFlag,
	canMarkForDeletion,
	canMove,
	canRename,
	canUnFlag
} from './ActionsFactory';
import { isFile, isFolder } from './utils';

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
		const canRenameWrapper: () => boolean = () => canRename(testFolder);
		expect(canRenameWrapper).toThrow('cannot evaluate canRename on Node type');
	});

	it('canRename: cannot evaluate canRename on empty nodes array', () => {
		const canRenameWrapper: () => boolean = () => canRename([]);
		expect(canRenameWrapper).toThrow('cannot evaluate canRename on empty nodes array');
	});

	it('canRename: cannot rename more than one node', () => {
		const testFolder1: Folder = populateFolder();
		const testFolder2: Folder = populateFolder();
		expect(canRename([testFolder1, testFolder2])).toBeFalsy();
	});

	it('canRename: canRename on Folder depend on can_write_folder value', () => {
		const testFolder1: Folder = populateFolder();
		testFolder1.permissions.can_write_folder = true;
		expect(canRename([testFolder1])).toBeTruthy();
		testFolder1.permissions.can_write_folder = false;
		expect(canRename([testFolder1])).toBeFalsy();
	});

	it('canRename: canRename on File depend on can_write_file value', () => {
		const testFile: File = populateFile();
		testFile.permissions.can_write_file = true;
		expect(canRename([testFile])).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canRename([testFile])).toBeFalsy();
	});

	it('canRename: cannot evaluate canRename on UnknownType', () => {
		const testUnknownType = populateUnknownNode();
		const canRenameWrapper: () => boolean = () => canRename([testUnknownType]);
		expect(canRenameWrapper).toThrow('cannot evaluate canRename on UnknownType');
	});

	it('canRename: can_write_file not defined', () => {
		const testFile: NodeWithoutPermission<File> = populateFile();
		testFile.permissions.can_write_file = undefined;
		const canRenameWrapper: () => boolean = () => canRename([testFile as File]);
		expect(canRenameWrapper).toThrow('can_write_file not defined');
	});

	it('canRename: can_write_folder not defined', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = undefined;
		const canRenameWrapper: () => boolean = () => canRename([testFolder as Folder]);
		expect(canRenameWrapper).toThrow('can_write_folder not defined');
	});

	/**
	 *  canFlag
	 *
	 * */
	it('canFlag: cannot evaluate canFlag on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canFlagWrapper: () => boolean = () => canFlag(testFolder);
		expect(canFlagWrapper).toThrow('cannot evaluate canFlag on Node type');
	});

	it('canFlag: cannot evaluate canFlag on empty nodes array', () => {
		const canFlagWrapper: () => boolean = () => canFlag([]);
		expect(canFlagWrapper).toThrow('cannot evaluate canFlag on empty nodes array');
	});

	it('canFlag: return true when applied to an array bigger than 1 with at least 1 unflagged node (flagged item will be re-flagged)', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFile.flagged = false;
		expect(canFlag([testFile, testFolder])).toBeTruthy();
	});

	it('canFlag: return false when applied to an array bigger than 1 with no unflagged nodes', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFolder.flagged = true;
		testFile.flagged = true;
		expect(canFlag([testFile, testFolder])).toBeFalsy();
	});

	it('canFlag: return true if un-flagged, false otherwise', () => {
		const testFolder: Folder = populateFolder();
		testFolder.flagged = true;
		expect(canFlag([testFolder])).toBeFalsy();
		testFolder.flagged = false;
		expect(canFlag([testFolder])).toBeTruthy();
	});

	/**
	 *  canUnFlag
	 *
	 * */
	it('canUnFlag: cannot evaluate canUnFlag on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canUnFlagWrapper: () => boolean = () => canUnFlag(testFolder);
		expect(canUnFlagWrapper).toThrow('cannot evaluate canUnFlag on Node type');
	});

	it('canUnFlag: cannot evaluate canUnFlag on empty nodes array', () => {
		const canUnFlagWrapper: () => boolean = () => canUnFlag([]);
		expect(canUnFlagWrapper).toThrow('cannot evaluate canUnFlag on empty nodes array');
	});

	it('canUnFlag: return true when applied to an array bigger than 1 with at least 1 flagged node (un-flagged item will be re-un-flagged)', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFile.flagged = true;
		expect(canUnFlag([testFile, testFolder])).toBeTruthy();
	});

	it('canUnFlag: return false when applied to an array bigger than 1 with no flagged nodes', () => {
		const testFolder: Folder = populateFolder();
		const testFile: File = populateFile();
		testFolder.flagged = false;
		testFile.flagged = false;
		expect(canUnFlag([testFile, testFolder])).toBeFalsy();
	});

	it('canUnFlag: return true if flagged, false otherwise', () => {
		const testFolder: Folder = populateFolder();
		testFolder.flagged = true;
		expect(canUnFlag([testFolder])).toBeTruthy();
		testFolder.flagged = false;
		expect(canUnFlag([testFolder])).toBeFalsy();
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
		const canMarkForDeletionWrapper: () => boolean = () => canMarkForDeletion([testUnknownType]);
		expect(canMarkForDeletionWrapper).toThrow('cannot evaluate canMarkForDeletion on UnknownType');
	});

	it('canMarkForDeletion: can_write_file not defined', () => {
		const testFile: NodeWithoutPermission<File> = populateFile();
		testFile.permissions.can_write_file = undefined;
		const canMarkForDeletionWrapper: () => boolean = () => canMarkForDeletion([testFile as File]);
		expect(canMarkForDeletionWrapper).toThrow('can_write_file not defined');
	});

	it('canMarkForDeletion: can_write_folder not defined', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = undefined;
		const canMarkForDeletionWrapper: () => boolean = () =>
			canMarkForDeletion([testFolder as Folder]);
		expect(canMarkForDeletionWrapper).toThrow('can_write_folder not defined');
	});

	it('canMarkForDeletion: canMarkForDeletion on Folder depend on can_write_file value', () => {
		const testFolder: Folder = populateFolder();
		testFolder.permissions.can_write_folder = false;
		expect(canMarkForDeletion(testFolder)).toBeFalsy();
		testFolder.permissions.can_write_folder = true;
		expect(canMarkForDeletion(testFolder)).toBeTruthy();
	});

	it('canMarkForDeletion: canMarkForDeletion on File depend on can_write_file value', () => {
		const testFile: File = populateFile();
		testFile.permissions.can_write_file = true;
		expect(canMarkForDeletion([testFile])).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canMarkForDeletion([testFile])).toBeFalsy();
	});

	it('canMarkForDeletion: canMarkForDeletion on Array return true if all nodes return true', () => {
		const testFile: File = populateFile();
		const testFile2: File = populateFile();
		const testFolder: Folder = populateFolder();
		testFolder.permissions.can_write_folder = true;
		testFile.permissions.can_write_file = true;
		testFile2.permissions.can_write_file = true;
		expect(canMarkForDeletion([testFile, testFile2, testFolder])).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canMarkForDeletion([testFile, testFile2, testFolder])).toBeFalsy();
	});

	/**
	 *  canMove
	 *
	 * */
	it('canMove: cannot evaluate canMove on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canMoveWrapper: () => boolean = () => canMove(testFolder);
		expect(canMoveWrapper).toThrow('cannot evaluate canMove on Node type');
	});

	it('canMove: cannot evaluate canMove on empty nodes array', () => {
		const canMoveWrapper: () => boolean = () => canMove([]);
		expect(canMoveWrapper).toThrow('cannot evaluate canMove on empty nodes array');
	});

	it('canMove: canMove on Folder depend on can_write_folder value of folder and parent', () => {
		const testFolder1: Folder = populateFolder();
		const parent = populateFolder();
		testFolder1.permissions.can_write_folder = true;
		testFolder1.parent = parent;
		parent.permissions.can_write_folder = true;
		expect(canMove([testFolder1])).toBeTruthy();
		testFolder1.permissions.can_write_folder = false;
		expect(canMove([testFolder1])).toBeFalsy();
		testFolder1.permissions.can_write_folder = true;
		testFolder1.parent = null;
		expect(canMove([testFolder1])).toBeFalsy();
		testFolder1.parent = parent;
		parent.permissions.can_write_folder = false;
		expect(canMove([testFolder1])).toBeFalsy();
	});

	it('canMove: canMove on File depend on can_write_file value of file and parent', () => {
		const testFile: File = populateFile();
		const parent = populateFolder();
		testFile.permissions.can_write_file = true;
		testFile.parent = parent;
		parent.permissions.can_write_file = true;
		expect(canMove([testFile])).toBeTruthy();
		testFile.permissions.can_write_file = false;
		expect(canMove([testFile])).toBeFalsy();
		testFile.permissions.can_write_file = true;
		testFile.parent = null;
		expect(canMove([testFile])).toBeFalsy();
		testFile.parent = parent;
		parent.permissions.can_write_file = false;
		expect(canMove([testFile])).toBeFalsy();
	});

	it('canMove: cannot evaluate canMove on UnknownType', () => {
		const testUnknownType = populateUnknownNode();
		const canMoveWrapper: () => boolean = () => canMove([testUnknownType]);
		expect(canMoveWrapper).toThrow('cannot evaluate canMove on UnknownType');
	});

	it('canMove: can_write_file not defined', () => {
		const testFile: NodeWithoutPermission<File> = populateFile();
		testFile.permissions.can_write_file = undefined;
		const canMoveWrapper: () => boolean = () => canMove([testFile as File]);
		expect(canMoveWrapper).toThrow('can_write_file not defined');
	});

	it('canMove: can_write_folder not defined', () => {
		const testFolder: NodeWithoutPermission<Folder> = populateFolder();
		testFolder.permissions.can_write_folder = undefined;
		const canMoveWrapper: () => boolean = () => canMove([testFolder as Folder]);
		expect(canMoveWrapper).toThrow('can_write_folder not defined');
	});

	/**
	 *  canCopy
	 *
	 * */
	it('canCopy: cannot evaluate canCopy on Node type', () => {
		const testFolder: Folder = populateFolder();
		const canCopyWrapper: () => boolean = () => canCopy(testFolder);
		expect(canCopyWrapper).toThrow('cannot evaluate canCopy on Node type');
	});

	it('canCopy: cannot evaluate canCopy on empty nodes array', () => {
		const canCopyWrapper: () => boolean = () => canCopy([]);
		expect(canCopyWrapper).toThrow('cannot evaluate canCopy on empty nodes array');
	});

	it('canCopy: canCopy on File/Folder is always allowed', () => {
		const testFile: File = populateFile();
		expect(canCopy([testFile])).toBeTruthy();
		const testFolder: Folder = populateFolder();
		expect(canCopy([testFolder])).toBeTruthy();
	});
});
