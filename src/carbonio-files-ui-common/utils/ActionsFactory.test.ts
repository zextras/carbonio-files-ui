/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
	canBeMoveDestination,
	canCopy,
	canCreateFolder,
	canFlag,
	canMarkForDeletion,
	canMove,
	canOpenVersionWithDocs,
	canPreview,
	canRename,
	canRestore,
	canUnFlag
} from './ActionsFactory';
import { docsHandledMimeTypes, isFile, isFolder } from './utils';
import { LOGGED_USER } from '../../mocks/constants';
import { ROOTS } from '../constants';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNode,
	populateNodes,
	populateUnknownNode,
	populateUser
} from '../mocks/mockUtils';
import { Node } from '../types/common';
import { File, Folder, NodeType } from '../types/graphql/types';

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
		it.each([undefined, 'unknown'])('should throw if typename is %s', (typename) => {
			const node = populateUnknownNode();
			node.__typename = typename as Node['__typename'];
			expect(() => canMarkForDeletion({ nodes: [node] })).toThrow(
				'cannot evaluate canMarkForDeletion on UnknownType'
			);
		});

		it('should throw if can_write_file is not defined on File', () => {
			const node: NodeWithoutPermission<File> = populateFile();
			node.permissions.can_write_file = undefined;
			expect(() => canMarkForDeletion({ nodes: [node as File] })).toThrow(
				'can_write_file not defined'
			);
		});

		it('should throw if can_write_folder is not defined on Folder', () => {
			const node: NodeWithoutPermission<Folder> = populateFolder();
			node.permissions.can_write_folder = undefined;
			expect(() => canMarkForDeletion({ nodes: [node as Folder] })).toThrow(
				'can_write_folder not defined'
			);
		});

		it.each<[boolean, boolean, (typeof ROOTS)[keyof typeof ROOTS]]>([
			[true, true, ROOTS.LOCAL_ROOT],
			[false, false, ROOTS.LOCAL_ROOT],
			[false, false, ROOTS.TRASH],
			[false, true, ROOTS.TRASH]
		])(
			'should return %s if can_write_file on File is %s and root id is %s',
			(expected, canWriteFile, rootId) => {
				const node = populateFile();
				node.permissions.can_write_file = canWriteFile;
				node.rootId = rootId;
				expect(canMarkForDeletion({ nodes: node })).toBe(expected);
			}
		);

		it.each<[boolean, boolean, (typeof ROOTS)[keyof typeof ROOTS]]>([
			[true, true, ROOTS.LOCAL_ROOT],
			[false, false, ROOTS.LOCAL_ROOT],
			[false, false, ROOTS.TRASH],
			[false, true, ROOTS.TRASH]
		])(
			'should return %s if can_write_folder on Folder is %s and root id is %s',
			(expected, canWriteFolder, rootId) => {
				const node = populateFolder();
				node.permissions.can_write_folder = canWriteFolder;
				node.rootId = rootId;
				expect(canMarkForDeletion({ nodes: node })).toBe(expected);
			}
		);

		it('should return true if all nodes of an array can be marked for deletion', () => {
			const file = populateFile();
			file.permissions.can_write_file = true;
			file.rootId = ROOTS.LOCAL_ROOT;
			const folder = populateFolder();
			folder.permissions.can_write_folder = true;
			folder.rootId = ROOTS.LOCAL_ROOT;
			expect(canMarkForDeletion({ nodes: [file, folder] })).toBe(true);
		});

		it('should return false if one node of an array cannot be marked for deletion', () => {
			const file = populateFile();
			file.permissions.can_write_file = true;
			file.rootId = ROOTS.LOCAL_ROOT;
			const folder = populateFolder();
			folder.permissions.can_write_folder = false;
			folder.rootId = ROOTS.LOCAL_ROOT;
			expect(canMarkForDeletion({ nodes: [file, folder] })).toBe(false);
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

		it('should return false if node is trashed', () => {
			const node = populateFolder();
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.parent = populateFolder();
			node.parent.permissions.can_write_file = true;
			node.parent.permissions.can_write_folder = true;
			node.rootId = ROOTS.TRASH;
			expect(canMove({ nodes: [node] })).toBe(false);
		});

		it('should return false if node parent is local root and owner is not logged user', () => {
			const node = populateFolder();
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.parent = populateLocalRoot();
			node.rootId = ROOTS.LOCAL_ROOT;
			node.owner = populateUser();
			expect(canMove({ nodes: [node] })).toBe(false);
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

		it(' return false when canUseDocs is false and others criteria are valid', () => {
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
				testFile.mime_type = 'application/pdf';
				expect(
					canPreview({
						nodes: [testFile],
						canUseDocs: true,
						canUsePreview: true
					})
				).toBeFalsy();
			});

			it.each([
				[true, 'application/msword', true, true, NodeType.Text],
				[true, 'application/vnd.ms-excel', true, true, NodeType.Spreadsheet],
				[true, 'application/vnd.ms-powerpoint', true, true, NodeType.Presentation],
				[
					true,
					'application/vnd.oasis.opendocument.presentation',
					true,
					true,
					NodeType.Presentation
				],
				[true, 'application/vnd.oasis.opendocument.spreadsheet', true, true, NodeType.Spreadsheet],
				[true, 'application/vnd.oasis.opendocument.text', true, true, NodeType.Text],
				[
					true,
					'application/vnd.openxmlformats-officedocument.presentationml.presentation',
					true,
					true,
					NodeType.Presentation
				],
				[
					true,
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					true,
					true,
					NodeType.Spreadsheet
				],
				[
					true,
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					true,
					true,
					NodeType.Text
				],
				[true, 'image/svg+xml', true, true, NodeType.Image],
				[true, 'image/png', true, true, NodeType.Image],
				[true, 'application/pdf', true, true, NodeType.Text],
				[false, 'application/msword', false, false, NodeType.Text],
				[false, 'application/vnd.ms-excel', false, false, NodeType.Spreadsheet],
				[false, 'application/vnd.ms-powerpoint', false, false, NodeType.Presentation],
				[
					false,
					'application/vnd.oasis.opendocument.presentation',
					false,
					false,
					NodeType.Presentation
				],
				[
					false,
					'application/vnd.oasis.opendocument.spreadsheet',
					false,
					false,
					NodeType.Spreadsheet
				],
				[false, 'application/vnd.oasis.opendocument.text', false, false, NodeType.Text],
				[
					false,
					'application/vnd.openxmlformats-officedocument.presentationml.presentation',
					false,
					false,
					NodeType.Presentation
				],
				[
					false,
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					false,
					false,
					NodeType.Spreadsheet
				],
				[
					false,
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					false,
					false,
					NodeType.Text
				],
				[false, 'image/svg+xml', false, false, NodeType.Image],
				[false, 'image/png', false, false, NodeType.Image],
				[false, 'application/pdf', false, false, NodeType.Text],
				[false, 'application/msword', true, false, NodeType.Text],
				[false, 'application/vnd.ms-excel', true, false, NodeType.Spreadsheet],
				[false, 'application/vnd.ms-powerpoint', true, false, NodeType.Presentation],
				[
					false,
					'application/vnd.oasis.opendocument.presentation',
					true,
					false,
					NodeType.Presentation
				],
				[
					false,
					'application/vnd.oasis.opendocument.spreadsheet',
					true,
					false,
					NodeType.Spreadsheet
				],
				[false, 'application/vnd.oasis.opendocument.text', true, false, NodeType.Text],
				[
					false,
					'application/vnd.openxmlformats-officedocument.presentationml.presentation',
					true,
					false,
					NodeType.Presentation
				],
				[
					false,
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					true,
					false,
					NodeType.Spreadsheet
				],
				[
					false,
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					true,
					false,
					NodeType.Text
				],
				[true, 'image/svg+xml', true, false, NodeType.Image],
				[true, 'image/png', true, false, NodeType.Image],
				[true, 'application/pdf', true, false, NodeType.Text],
				[false, 'application/msword', false, true, NodeType.Text],
				[false, 'application/vnd.ms-excel', false, true, NodeType.Spreadsheet],
				[false, 'application/vnd.ms-powerpoint', false, true, NodeType.Presentation],
				[
					false,
					'application/vnd.oasis.opendocument.presentation',
					false,
					true,
					NodeType.Presentation
				],
				[
					false,
					'application/vnd.oasis.opendocument.spreadsheet',
					false,
					true,
					NodeType.Spreadsheet
				],
				[false, 'application/vnd.oasis.opendocument.text', false, true, NodeType.Text],
				[
					false,
					'application/vnd.openxmlformats-officedocument.presentationml.presentation',
					false,
					true,
					NodeType.Presentation
				],
				[
					false,
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					false,
					true,
					NodeType.Spreadsheet
				],
				[
					false,
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					false,
					true,
					NodeType.Text
				],
				[false, 'image/svg+xml', false, true, NodeType.Image],
				[false, 'image/png', false, true, NodeType.Image],
				[false, 'application/pdf', false, true, NodeType.Text]
			])(
				'should return %s when mime Type is %s, canUsePreview is %s and canUseDocs is %s',
				(expectedResult, mimeType, canUsePreview, canUseDocs, type) => {
					const testFile = populateFile();
					testFile.mime_type = mimeType;
					testFile.type = type;
					expect(canPreview({ nodes: [testFile], canUseDocs, canUsePreview })).toBe(expectedResult);
				}
			);

			it('should return false when file NodeType is not NodeType.Video', () => {
				const testFile = populateFile();
				[testFile.type] = Object.values(NodeType).filter((nodeType) => nodeType !== NodeType.Video);
				expect(
					canPreview({ nodes: [testFile], canUseDocs: false, canUsePreview: false })
				).toBeFalsy();
			});

			it('should return true when file NodeType is NodeType.Video', () => {
				const testFile = populateFile();
				testFile.type = NodeType.Video;
				expect(
					canPreview({ nodes: [testFile], canUseDocs: false, canUsePreview: false })
				).toBeTruthy();
			});
		});
	});

	describe('canRestore', () => {
		it.each([undefined, 'unknown'])('should throw if typename is %s', (typename) => {
			const node = populateUnknownNode();
			node.__typename = typename as Node['__typename'];
			expect(() => canRestore({ nodes: [node] })).toThrow(
				'cannot evaluate canRestore on UnknownType'
			);
		});

		it('should throw if can_write_file is not defined on File', () => {
			const node: NodeWithoutPermission<File> = populateFile();
			node.permissions.can_write_file = undefined;
			expect(() => canRestore({ nodes: [node as File] })).toThrow('can_write_file not defined');
		});

		it('should throw if can_write_folder is not defined on Folder', () => {
			const node: NodeWithoutPermission<Folder> = populateFolder();
			node.permissions.can_write_folder = undefined;
			expect(() => canRestore({ nodes: [node as Folder] })).toThrow('can_write_folder not defined');
		});

		it.each<[boolean, boolean, (typeof ROOTS)[keyof typeof ROOTS]]>([
			[true, true, ROOTS.TRASH],
			[false, false, ROOTS.TRASH],
			[false, false, ROOTS.LOCAL_ROOT],
			[false, true, ROOTS.LOCAL_ROOT]
		])(
			'should return %s if can_write_file on File is %s and root id is %s',
			(expected, canWriteFile, rootId) => {
				const node = populateFile();
				node.permissions.can_write_file = canWriteFile;
				node.rootId = rootId;
				expect(canRestore({ nodes: node })).toBe(expected);
			}
		);

		it.each<[boolean, boolean, (typeof ROOTS)[keyof typeof ROOTS]]>([
			[true, true, ROOTS.TRASH],
			[false, false, ROOTS.TRASH],
			[false, false, ROOTS.LOCAL_ROOT],
			[false, true, ROOTS.LOCAL_ROOT]
		])(
			'should return %s if can_write_folder on Folder is %s and root id is %s',
			(expected, canWriteFolder, rootId) => {
				const node = populateFolder();
				node.permissions.can_write_folder = canWriteFolder;
				node.rootId = rootId;
				expect(canRestore({ nodes: node })).toBe(expected);
			}
		);

		it('should return true if all nodes of an array can be restored', () => {
			const file = populateFile();
			file.permissions.can_write_file = true;
			file.rootId = ROOTS.TRASH;
			const folder = populateFolder();
			folder.permissions.can_write_folder = true;
			folder.rootId = ROOTS.TRASH;
			expect(canRestore({ nodes: [file, folder] })).toBe(true);
		});

		it('should return false if one node of an array cannot be restored', () => {
			const file = populateFile();
			file.permissions.can_write_file = true;
			file.rootId = ROOTS.TRASH;
			const folder = populateFolder();
			folder.permissions.can_write_folder = false;
			folder.rootId = ROOTS.TRASH;
			expect(canRestore({ nodes: [file, folder] })).toBe(false);
		});
	});

	describe('canBeMoveDestination', () => {
		it('should return true if all conditions are matched', () => {
			const owner = populateUser();
			const destination = populateFolder();
			destination.permissions.can_write_folder = true;
			destination.permissions.can_write_file = true;
			destination.owner = owner;
			destination.rootId = ROOTS.LOCAL_ROOT;
			const nodesToMove = populateNodes(2);
			nodesToMove.forEach((node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.rootId = ROOTS.LOCAL_ROOT;
				node.owner = owner;
				node.parent = populateFolder();
				node.parent.permissions.can_write_file = true;
				node.parent.permissions.can_write_folder = true;
			});
			expect(canBeMoveDestination(destination, nodesToMove)).toBe(true);
		});

		it('should return false if destination folder has can_write_file false and a file is moved', () => {
			const owner = populateUser();
			const destination = populateFolder();
			destination.permissions.can_write_folder = true;
			destination.permissions.can_write_file = false;
			destination.owner = owner;
			destination.rootId = ROOTS.LOCAL_ROOT;
			const node = populateFile();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.rootId = ROOTS.LOCAL_ROOT;
			node.owner = owner;
			node.parent = populateFolder();
			node.parent.permissions.can_write_file = true;
			node.parent.permissions.can_write_folder = true;
			expect(canBeMoveDestination(destination, [node])).toBe(false);
		});

		it('should return false if destination folder has can_write_folder false and a folder is moved', () => {
			const owner = populateUser();
			const destination = populateFolder();
			destination.permissions.can_write_folder = false;
			destination.permissions.can_write_file = true;
			destination.owner = owner;
			destination.rootId = ROOTS.LOCAL_ROOT;
			const node = populateFolder();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.rootId = ROOTS.LOCAL_ROOT;
			node.owner = owner;
			node.parent = populateFolder();
			node.parent.permissions.can_write_file = true;
			node.parent.permissions.can_write_folder = true;
			expect(canBeMoveDestination(destination, [node])).toBe(false);
		});

		it('should return false if node to move cannot be moved', () => {
			const owner = populateUser();
			const destination = populateFolder();
			destination.permissions.can_write_folder = true;
			destination.permissions.can_write_file = true;
			destination.owner = owner;
			destination.rootId = ROOTS.LOCAL_ROOT;
			const node = populateFolder();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.rootId = ROOTS.TRASH;
			node.owner = owner;
			node.parent = populateFolder();
			node.parent.permissions.can_write_file = true;
			node.parent.permissions.can_write_folder = true;
			expect(canBeMoveDestination(destination, [node])).toBe(false);
		});

		it('should return false if destination folder is trashed', () => {
			const owner = populateUser();
			const destination = populateFolder();
			destination.permissions.can_write_folder = true;
			destination.permissions.can_write_file = true;
			destination.owner = owner;
			destination.rootId = ROOTS.TRASH;
			const node = populateFolder();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.rootId = ROOTS.LOCAL_ROOT;
			node.owner = owner;
			node.parent = populateFolder();
			node.parent.permissions.can_write_file = true;
			node.parent.permissions.can_write_folder = true;
			expect(canBeMoveDestination(destination, [node])).toBe(false);
		});

		it('should return false if destination folder and node to move have different owners', () => {
			const owner = populateUser();
			const destination = populateFolder();
			destination.permissions.can_write_folder = true;
			destination.permissions.can_write_file = true;
			destination.owner = owner;
			destination.rootId = ROOTS.LOCAL_ROOT;
			const node = populateFolder();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.rootId = ROOTS.LOCAL_ROOT;
			node.owner = populateUser();
			node.parent = populateFolder();
			node.parent.permissions.can_write_file = true;
			node.parent.permissions.can_write_folder = true;
			expect(canBeMoveDestination(destination, [node])).toBe(false);
		});

		it('should return false if destination folder is in the nodes to move', () => {
			const owner = populateUser();
			const destination = populateFolder();
			destination.permissions.can_write_folder = true;
			destination.permissions.can_write_file = true;
			destination.owner = owner;
			destination.rootId = ROOTS.LOCAL_ROOT;
			const node = populateFolder();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.rootId = ROOTS.LOCAL_ROOT;
			node.owner = owner;
			node.parent = populateFolder();
			node.parent.permissions.can_write_file = true;
			node.parent.permissions.can_write_folder = true;
			expect(canBeMoveDestination(destination, [node, destination])).toBe(false);
		});
	});
});
