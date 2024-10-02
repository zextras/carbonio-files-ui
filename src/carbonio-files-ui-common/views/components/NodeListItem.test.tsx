/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent } from '@testing-library/react';
import { DefaultTheme } from 'styled-components';

import { NodeListItem, NodeListItemProps } from './NodeListItem';
import * as useNavigation from '../../../hooks/useNavigation';
import {
	DATE_FORMAT_SHORT,
	INTERNAL_PATH,
	PREVIEW_PATH,
	PREVIEW_TYPE,
	REST_ENDPOINT,
	ROOTS,
	VIEW_MODE
} from '../../constants';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import { ListContext } from '../../contexts';
import * as useHealthInfo from '../../hooks/useHealthInfo';
import * as useOpenWithDocs from '../../hooks/useOpenWithDocs';
import * as usePreview from '../../hooks/usePreview';
import {
	populateFile,
	populateFolder,
	populateNode,
	populateShares,
	populateUser
} from '../../mocks/mockUtils';
import { setup, screen, within } from '../../tests/utils';
import { NodeListItemType } from '../../types/common';
import { NodeType, User } from '../../types/graphql/types';
import {
	MIME_TYPE_PREVIEW_SUPPORT,
	PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS
} from '../../utils/previewUtils';
import { formatDate, humanFileSize } from '../../utils/utils';
import 'jest-styled-components';

export function getMissingProps(): Pick<
	NodeListItemProps,
	'isSelected' | 'isSelectionModeActive' | 'selectId' | 'exitSelectionMode'
> {
	return {
		isSelected: false,
		isSelectionModeActive: false,
		selectId: jest.fn(),
		exitSelectionMode: jest.fn()
	};
}

let mockedUserLogged: User;

beforeEach(() => {
	mockedUserLogged = populateUser(global.mockedUserLogged.id, global.mockedUserLogged.name);
});

const mimeTypesWithThumbnailSupport = Object.keys(MIME_TYPE_PREVIEW_SUPPORT).filter(
	(mimeType) => MIME_TYPE_PREVIEW_SUPPORT[mimeType].thumbnail
);

const mimeTypesWithThumbnailNotSupported = Object.keys(MIME_TYPE_PREVIEW_SUPPORT).filter(
	(mimeType) => !MIME_TYPE_PREVIEW_SUPPORT[mimeType].thumbnail
);

describe('Node List Item', () => {
	describe.each([VIEW_MODE.list, VIEW_MODE.grid])('%s mode', (viewMode) => {
		describe('double click behaviour', () => {
			it.each([
				['open with docs', true, true, true, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0], NodeType.Text],
				['do nothing', true, false, true, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0], NodeType.Text],
				[
					'open with docs',
					false,
					true,
					true,
					PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0],
					NodeType.Text
				],
				['do nothing', false, false, true, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0], NodeType.Text],
				['open preview', true, true, false, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0], NodeType.Text],
				['do nothing', true, false, false, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0], NodeType.Text],
				[
					'open with docs',
					false,
					true,
					false,
					PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0],
					NodeType.Text
				],
				['do nothing', false, false, false, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0], NodeType.Text],
				['open preview', true, true, true, 'application/pdf', NodeType.Text],
				['open preview', true, false, true, 'application/pdf', NodeType.Text],
				['do nothing', false, true, true, 'application/pdf', NodeType.Text],
				['do nothing', false, false, true, 'application/pdf', NodeType.Text],
				['open preview', true, true, false, 'application/pdf', NodeType.Text],
				['open preview', true, false, false, 'application/pdf', NodeType.Text],
				['do nothing', false, true, false, 'application/pdf', NodeType.Text],
				['do nothing', false, false, false, 'application/pdf', NodeType.Text],
				['open preview', true, true, true, 'image/png', NodeType.Image],
				['open preview', true, false, true, 'image/png', NodeType.Image],
				['do nothing', false, true, true, 'image/png', NodeType.Image],
				['do nothing', false, false, true, 'image/png', NodeType.Image],
				['open preview', true, true, false, 'image/png', NodeType.Image],
				['open preview', true, false, false, 'image/png', NodeType.Image],
				['do nothing', false, true, false, 'image/png', NodeType.Image],
				['do nothing', false, false, false, 'image/png', NodeType.Image],
				['open preview', false, false, false, 'video/mp4', NodeType.Video]
			])(
				`should %s when canUsePreview is %s, canUseDocs is %s, canWriteFile is %s, mime_type is %s `,
				async (action, canUsePreview, canUseDocs, canWriteFile, mimeType, type) => {
					const openWithDocsFn = jest.fn();
					jest.spyOn(useOpenWithDocs, 'useOpenWithDocs').mockReturnValue(openWithDocsFn);
					const openPreview = jest.fn();

					jest.spyOn(usePreview, 'usePreview').mockReturnValue({
						openPreview,
						initPreview: () => undefined,
						emptyPreview: () => undefined,
						createPreview: () => undefined
					});

					jest.spyOn(useHealthInfo, 'useHealthInfo').mockReturnValue({
						canUsePreview,
						canUseDocs
					});

					const node = populateFile();
					node.type = type;
					node.permissions.can_write_file = canWriteFile;
					node.mime_type = mimeType;

					const { user } = setup(
						<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
							<NodeListItem node={node} {...getMissingProps()} />
						</ListContext.Provider>
					);

					await user.dblClick(screen.getByText(node.name));
					if (action === 'open with docs') {
						expect(openPreview).not.toHaveBeenCalled();
						expect(openWithDocsFn).toHaveBeenCalled();
					} else if (action === 'open preview') {
						expect(openPreview).toHaveBeenCalled();
						expect(openWithDocsFn).not.toHaveBeenCalled();
					} else if (action === 'do nothing') {
						expect(openPreview).not.toHaveBeenCalled();
						expect(openWithDocsFn).not.toHaveBeenCalled();
					} else {
						throw new Error('Unhandled');
					}
				}
			);
		});

		test('render a basic node in the list, logged user is owner and last editor', () => {
			const node = populateNode();
			node.owner = mockedUserLogged;
			node.last_editor = mockedUserLogged;
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);

			expect(screen.getByText(node.name)).toBeVisible();
			expect(
				screen.getByText(formatDate(node.updated_at, undefined, DATE_FORMAT_SHORT))
			).toBeVisible();
			expect(screen.queryByText(mockedUserLogged.full_name)).not.toBeInTheDocument();
		});

		test('render a folder item in the list', () => {
			const node = populateFolder();
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByText(/folder/i)).toBeInTheDocument();
			expect(screen.getByText(/folder/i)).toBeVisible();
		});

		test('ArrowCircleRight icon is visible if node is shared by me', () => {
			const node = populateNode();
			node.shares = populateShares(node, 1);
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByTestId(ICON_REGEXP.sharedByMe)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.sharedByMe)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.sharedWithMe)).not.toBeInTheDocument();
		});

		test('ArrowCircleLeft icon is visible if node is shared with me', () => {
			const node = populateNode();
			node.owner = populateUser();
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByTestId(ICON_REGEXP.sharedWithMe)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.sharedWithMe)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
		});

		test('incoming and outgoing share icons are not visible if node is not shared', () => {
			const node = populateNode();
			node.shares = [];
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.queryByTestId(ICON_REGEXP.sharedWithMe)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
		});

		test('flag icon is visible if node is flagged', () => {
			const node = populateNode();
			node.flagged = true;
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeVisible();
		});

		test('flag icon is not visible if node is not flagged', () => {
			const node = populateNode();
			node.flagged = false;
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
		});

		test('render a file item in the list', () => {
			const node = populateFile();
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByText(node.extension as string)).toBeVisible();
			expect(screen.getByText(humanFileSize(node.size, undefined))).toBeVisible();
		});

		test('owner is visible if different from logged user', () => {
			const node = populateNode();
			node.owner = populateUser();
			node.last_editor = node.owner;
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByText(node.owner.full_name)).toBeVisible();
		});

		test('last modifier is visible if node is shared', () => {
			const node = populateNode();
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByText((node.last_editor as User).full_name)).toBeVisible();
		});

		test('double click on a folder activates navigation', async () => {
			const mockedHistory: Array<string> = [];
			const mockedUseNavigationHook = {
				navigateToFolder: jest.fn((path) => {
					mockedHistory.push(path);
				}),
				navigateTo: jest.fn(),
				navigateBack: jest.fn()
			};
			jest.spyOn(useNavigation, 'useNavigation').mockReturnValue(mockedUseNavigationHook);

			const node = populateFolder(0);
			const { user } = setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			await user.dblClick(screen.getByText(node.name));
			expect(mockedUseNavigationHook.navigateToFolder).toHaveBeenCalledTimes(1);
			expect(mockedHistory).toContain(node.id);
			expect(mockedHistory[mockedHistory.length - 1]).toBe(node.id);
		});

		test('double click on a folder with selection mode active does nothing', async () => {
			const mockedUseNavigationHook = {
				navigateToFolder: jest.fn(),
				navigateTo: jest.fn(),
				navigateBack: jest.fn()
			};
			jest.spyOn(useNavigation, 'useNavigation').mockReturnValue(mockedUseNavigationHook);
			const node = populateFolder(0);
			const { user } = setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} isSelectionModeActive />
				</ListContext.Provider>
			);
			await user.dblClick(screen.getByText(node.name));
			expect(mockedUseNavigationHook.navigateTo).not.toHaveBeenCalled();
		});

		test('double click on a folder marked for deletion does nothing', async () => {
			const mockedUseNavigationHook = {
				navigateToFolder: jest.fn(),
				navigateTo: jest.fn(),
				navigateBack: jest.fn()
			};
			jest.spyOn(useNavigation, 'useNavigation').mockReturnValue(mockedUseNavigationHook);
			const node = populateFolder(0);
			node.rootId = ROOTS.TRASH;
			const { user } = setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			await user.dblClick(screen.getByText(node.name));
			expect(mockedUseNavigationHook.navigateTo).not.toHaveBeenCalled();
		});

		test('double click on a folder disabled does nothing', async () => {
			const mockedUseNavigationHook = {
				navigateToFolder: jest.fn(),
				navigateTo: jest.fn(),
				navigateBack: jest.fn()
			};
			jest.spyOn(useNavigation, 'useNavigation').mockReturnValue(mockedUseNavigationHook);
			const node = populateFolder(0);
			const { user } = setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			await user.dblClick(screen.getByText(node.name));
			expect(mockedUseNavigationHook.navigateTo).not.toHaveBeenCalled();
		});

		test('Trash icon is visible if node is trashed and is search view', () => {
			const node = populateNode();
			node.rootId = ROOTS.TRASH;
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>,
				{
					initialRouterEntries: [INTERNAL_PATH.SEARCH]
				}
			);
			expect(screen.getByText(node.name)).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.trash)).toBeVisible();
		});

		test('Trash icon is not visible if node is trashed but is not search view', () => {
			const node = populateNode();
			node.rootId = ROOTS.TRASH;
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByText(node.name)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.trash)).not.toBeInTheDocument();
		});

		test('Trash icon is not visible if node is not trashed and is search view', () => {
			const node = populateNode();
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>,
				{
					initialRouterEntries: [INTERNAL_PATH.SEARCH]
				}
			);
			expect(screen.getByText(node.name)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.trash)).not.toBeInTheDocument();
		});

		test.each<
			[
				type: NodeType,
				mimeType: string | undefined,
				icon: keyof DefaultTheme['icons'],
				color: string
			]
		>([
			[NodeType.Folder, 'any', 'Folder', '#828282'],
			[NodeType.Text, 'application/pdf', 'FilePdf', '#d74942'],
			[NodeType.Text, 'any', 'FileText', '#2b73d2'],
			[NodeType.Video, 'any', 'Video', '#d74942'],
			[NodeType.Audio, 'any', 'Music', '#414141'],
			[NodeType.Image, 'any', 'Image', '#d74942'],
			[NodeType.Message, 'any', 'Email', '#2b73d2'],
			[NodeType.Presentation, 'any', 'FilePresentation', '#FFA726'],
			[NodeType.Spreadsheet, 'any', 'FileCalc', '#8bc34a'],
			[NodeType.Application, 'any', 'Code', '#414141'],
			[NodeType.Other, 'any', 'File', '#2b73d2']
		])(
			'node with type %s and mimetype %s show icon %s with color %s',
			(type, mimeType, icon, color) => {
				const node = populateFile('id', 'name');
				node.type = type;
				node.mime_type = mimeType ?? '';
				setup(
					<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
						<NodeListItem node={node} {...getMissingProps()} />
					</ListContext.Provider>
				);
				expect(
					within(screen.getByTestId(SELECTORS.nodeAvatar)).getByTestId(`icon: ${icon}`)
				).toBeVisible();
				expect(
					within(screen.getByTestId(SELECTORS.nodeAvatar)).getByTestId(`icon: ${icon}`)
				).toHaveStyleRule('color', color);
			}
		);

		test('should show thumbnail of gif image with gif format', async () => {
			const node = populateFile('id', 'name');
			node.type = NodeType.Image;
			node.mime_type = 'image/gif';
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByTestId(SELECTORS.nodeAvatar)).toHaveStyle({
				background: expect.stringContaining(
					`${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.IMAGE}/id/1/80x80/thumbnail/?shape=rectangular&quality=high&output_format=gif`
				)
			});
		});
		test.each<[rootType: string, icon: keyof DefaultTheme['icons'], color: string]>([
			[ROOTS.SHARED_WITH_ME, 'ArrowCircleLeft', '#AB47BC'],
			[ROOTS.TRASH, 'Trash2', '#828282'],
			[ROOTS.LOCAL_ROOT, 'Folder', '#828282']
		])('node with root type %s show icon %s with color %s', (rootType, icon, color) => {
			const node: NodeListItemType = { ...populateFolder(undefined, rootType) };
			node.type = NodeType.Root;
			setup(
				<ListContext.Provider value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode }}>
					<NodeListItem node={node} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByTestId(`icon: ${icon}`)).toBeVisible();
			expect(screen.getByTestId(`icon: ${icon}`)).toHaveStyleRule('color', color);
		});
	});
	test('unflag action on hover is visible if node is flagged', () => {
		const node = populateNode();
		node.flagged = true;

		setup(
			<ListContext.Provider
				value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode: VIEW_MODE.list }}
			>
				<NodeListItem node={node} {...getMissingProps()} />
			</ListContext.Provider>
		);
		expect(screen.getByTestId(ICON_REGEXP.unflag)).toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.flag)).not.toBeInTheDocument();
	});

	test('flag action on hover is visible if node is not flagged ', async () => {
		const node = populateNode();
		node.flagged = false;
		setup(
			<ListContext.Provider
				value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode: VIEW_MODE.list }}
			>
				<NodeListItem node={node} {...getMissingProps()} />
			</ListContext.Provider>
		);
		expect(screen.getByTestId(ICON_REGEXP.flag)).toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.unflag)).not.toBeInTheDocument();
	});

	it('should not show preview image when node is a folder', () => {
		const folder = populateFolder();
		setup(
			<ListContext.Provider
				value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode: VIEW_MODE.grid }}
			>
				<NodeListItem node={folder} {...getMissingProps()} />
			</ListContext.Provider>
		);
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it.each(mimeTypesWithThumbnailSupport)(
		'should show preview image when node is a file and mime type is %s',
		(mimeType) => {
			const file = populateFile();
			file.mime_type = mimeType;
			setup(
				<ListContext.Provider
					value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode: VIEW_MODE.grid }}
				>
					<NodeListItem node={file} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.getByRole('img')).toBeVisible();
		}
	);

	it.each(mimeTypesWithThumbnailNotSupported)(
		'should not show preview image when node is a file and thumbnail for mime type %s is disabled',
		(mimeType) => {
			const file = populateFile();
			file.mime_type = mimeType;
			setup(
				<ListContext.Provider
					value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode: VIEW_MODE.grid }}
				>
					<NodeListItem node={file} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(screen.queryByRole('img')).not.toBeInTheDocument();
		}
	);

	test.each<[type: NodeType, mimeType: string, icon: keyof DefaultTheme['icons']]>([
		[NodeType.Text, 'application/pdf', 'FilePdf'],
		[NodeType.Text, 'any', 'FileText'],
		[NodeType.Video, 'any', 'Video'],
		[NodeType.Audio, 'any', 'Music'],
		[NodeType.Image, 'any', 'Image'],
		[NodeType.Message, 'any', 'Email'],
		[NodeType.Presentation, 'any', 'FilePresentation'],
		[NodeType.Spreadsheet, 'any', 'FileCalc'],
		[NodeType.Application, 'any', 'Code'],
		[NodeType.Other, 'any', 'File']
	])(
		'should show icon instead of preview for files with type %s and mimetype %s',
		(type, mimeType, icon) => {
			const file = populateFile();
			file.mime_type = mimeType;
			file.type = type;
			setup(
				<ListContext.Provider
					value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode: VIEW_MODE.grid }}
				>
					<NodeListItem node={file} {...getMissingProps()} />
				</ListContext.Provider>
			);
			expect(
				within(screen.getByTestId(SELECTORS.gridCellThumbnail)).getByTestId(`icon: ${icon}`)
			).toBeVisible();
		}
	);

	it('should show error message when preview request fails', async () => {
		const file = populateFile();
		file.mime_type = 'image/jpeg';
		setup(
			<ListContext.Provider
				value={{ setIsEmpty: jest.fn(), isEmpty: false, viewMode: VIEW_MODE.grid }}
			>
				<NodeListItem node={file} {...getMissingProps()} />
			</ListContext.Provider>
		);
		fireEvent.error(screen.getByRole('img'));
		expect(await screen.findByText('Failed to load image')).toBeVisible();
	});
});
