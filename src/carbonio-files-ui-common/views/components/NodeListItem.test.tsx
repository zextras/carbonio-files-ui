/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { DefaultTheme } from 'styled-components';

import { NodeListItem } from './NodeListItem';
import { INTERNAL_PATH, PREVIEW_PATH, PREVIEW_TYPE, REST_ENDPOINT, ROOTS } from '../../constants';
import { ICON_REGEXP } from '../../constants/test';
import { populateFile, populateFolder, populateNode, populateUser } from '../../mocks/mockUtils';
import { NodeType, User } from '../../types/graphql/types';
import { getPermittedHoverBarActions } from '../../utils/ActionsFactory';
import { setup } from '../../utils/testUtils';
import { formatDate, humanFileSize } from '../../utils/utils';
import 'jest-styled-components';

let mockedUserLogged: User;
let mockedHistory: string[];
let mockedNavigation: jest.Mock;

beforeEach(() => {
	mockedUserLogged = populateUser(global.mockedUserLogged.id, global.mockedUserLogged.name);
	mockedHistory = [];
	mockedNavigation = jest.fn((path) => {
		mockedHistory.push(path);
	});
});

describe('Node List Item', () => {
	test('render a basic node in the list, logged user is owner and last editor', () => {
		const node = populateNode();
		setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				updatedAt={node.updated_at}
				owner={mockedUserLogged}
				lastEditor={mockedUserLogged}
			/>
		);

		expect(screen.getByTestId(`node-item-${node.id}`)).toBeInTheDocument();
		expect(screen.getByTestId(`node-item-${node.id}`)).toBeVisible();
		expect(screen.getByTestId(`node-item-${node.id}`)).not.toBeEmptyDOMElement();
		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.getByText(formatDate(node.updated_at, undefined, 'UTC'))).toBeVisible();
		expect(screen.queryByText(mockedUserLogged.full_name)).not.toBeInTheDocument();
	});

	test('render a folder item in the list', () => {
		const node = populateFolder();
		setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				updatedAt={node.updated_at}
				owner={node.owner}
			/>
		);
		expect(screen.getByText(/folder/i)).toBeInTheDocument();
		expect(screen.getByText(/folder/i)).toBeVisible();
	});

	test('ArrowCircleRight icon is visible if node is shared by me', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} outgoingShare />);
		expect(screen.getByTestId(ICON_REGEXP.sharedByMe)).toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.sharedByMe)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.sharedWithMe)).not.toBeInTheDocument();
	});

	test('ArrowCircleLeft icon is visible if node is shared with me', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} incomingShare />);
		expect(screen.getByTestId(ICON_REGEXP.sharedWithMe)).toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.sharedWithMe)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
	});

	test('incoming and outgoing share icons are not visible if node is not shared', () => {
		const node = populateNode();
		setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				incomingShare={false}
				outgoingShare={false}
			/>
		);
		expect(screen.queryByTestId(ICON_REGEXP.sharedWithMe)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
	});

	test('link icon is visible if node is linked', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} linkActive />);
		expect(screen.getByTestId(ICON_REGEXP.link)).toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.link)).toBeVisible();
	});

	test('link icon is not visible if node is not linked', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} linkActive={false} />);
		expect(screen.queryByTestId(ICON_REGEXP.link)).not.toBeInTheDocument();
	});

	test('flag icon is visible if node is flagged', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} flagActive />);
		expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeVisible();
	});

	test('flag icon is not visible if node is not flagged', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} flagActive={false} />);
		expect(screen.queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
	});

	test('unflag action on hover is visible if node is flagged', () => {
		const node = populateNode();
		node.flagged = true;

		setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				flagActive={node.flagged}
				permittedHoverBarActions={getPermittedHoverBarActions(node)}
			/>
		);
		expect(screen.getByTestId(ICON_REGEXP.unflag)).toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.flag)).not.toBeInTheDocument();
	});

	test('flag action on hover is visible if node is not flagged ', async () => {
		const node = populateNode();
		node.flagged = false;
		setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				flagActive={node.flagged}
				permittedHoverBarActions={getPermittedHoverBarActions(node)}
			/>
		);
		expect(screen.getByTestId(ICON_REGEXP.flag)).toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.unflag)).not.toBeInTheDocument();
	});

	test('click on hover flag action changes flag icon visibility', async () => {
		const node = populateNode();
		node.flagged = false;

		const toggleFlagTrueFunction = jest.fn();

		const { user } = setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				flagActive={node.flagged}
				toggleFlagTrue={toggleFlagTrueFunction}
				permittedHoverBarActions={getPermittedHoverBarActions(node)}
			/>
		);
		expect(screen.queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
		await user.click(screen.getByTestId(ICON_REGEXP.flag));
		expect(toggleFlagTrueFunction).toHaveBeenCalledTimes(1);
	});

	test('click on hover unflag action changes flag icon visibility', async () => {
		const node = populateNode();
		node.flagged = true;

		const toggleFlagFalseFunction = jest.fn();

		const { user } = setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				flagActive={node.flagged}
				toggleFlagFalse={toggleFlagFalseFunction}
				permittedHoverBarActions={getPermittedHoverBarActions(node)}
			/>
		);
		expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeVisible();
		await user.click(screen.getByTestId(ICON_REGEXP.unflag));
		expect(toggleFlagFalseFunction).toHaveBeenCalledTimes(1);
	});

	test('render a file item in the list', () => {
		const node = populateFile();
		setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				size={node.size}
				mimeType={node.mime_type}
				extension={node.extension}
			/>
		);
		expect(screen.getByText(node.extension as string)).toBeVisible();
		expect(screen.getByText(humanFileSize(node.size))).toBeVisible();
	});

	test('owner is visible if different from logged user', () => {
		const node = populateNode();
		node.owner = populateUser();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} owner={node.owner} />);
		expect(screen.getByText(node.owner.full_name)).toBeVisible();
	});

	test('last modifier is visible if node is shared', () => {
		const node = populateNode();
		setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				owner={mockedUserLogged}
				lastEditor={node.last_editor}
				navigateTo={mockedNavigation}
			/>
		);
		expect(screen.getByText((node.last_editor as User).full_name)).toBeVisible();
	});

	test('double click on a folder activates navigation', async () => {
		const node = populateFolder(0);
		const setActiveFn = jest.fn();
		const { user } = setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				setActive={setActiveFn}
				navigateTo={mockedNavigation}
			/>
		);
		await user.dblClick(screen.getByTestId(`node-item-${node.id}`));
		expect(mockedNavigation).toHaveBeenCalledTimes(1);
		expect(mockedHistory).toContain(node.id);
		expect(mockedHistory[mockedHistory.length - 1]).toBe(node.id);
	});

	test('double click on a folder with selection mode active does nothing', async () => {
		const node = populateFolder(0);
		const setActiveFn = jest.fn();
		const { user } = setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				isSelectionModeActive
				setActive={setActiveFn}
				navigateTo={mockedNavigation}
			/>
		);
		await user.dblClick(screen.getByTestId(`node-item-${node.id}`));
		expect(mockedNavigation).not.toHaveBeenCalled();
	});

	test('double click on a folder marked for deletion does nothing', async () => {
		const node = populateFolder(0);
		const setActiveFn = jest.fn();
		const { user } = setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				setActive={setActiveFn}
				trashed
			/>
		);
		await user.dblClick(screen.getByTestId(`node-item-${node.id}`));
		expect(mockedNavigation).not.toHaveBeenCalled();
	});

	test('double click on a folder disabled does nothing', async () => {
		const node = populateFolder(0);
		const setActiveFn = jest.fn();
		const { user } = setup(
			<NodeListItem
				id={node.id}
				name={node.name}
				type={node.type}
				setActive={setActiveFn}
				disabled
			/>
		);
		await user.dblClick(screen.getByTestId(`node-item-${node.id}`));
		expect(mockedNavigation).not.toHaveBeenCalled();
	});

	test('Trash icon is visible if node is trashed and is search view', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} trashed />, {
			initialRouterEntries: [INTERNAL_PATH.SEARCH]
		});
		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.trash)).toBeVisible();
	});

	test('Trash icon is not visible if node is trashed but is not search view', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} trashed />);
		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.trash)).not.toBeInTheDocument();
	});

	test('Trash icon is not visible if node is not trashed and is search view', () => {
		const node = populateNode();
		setup(<NodeListItem id={node.id} name={node.name} type={node.type} trashed={false} />, {
			initialRouterEntries: [INTERNAL_PATH.SEARCH]
		});
		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.trash)).not.toBeInTheDocument();
	});

	test.each<
		[type: NodeType, mimeType: string | undefined, icon: keyof DefaultTheme['icons'], color: string]
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
			setup(<NodeListItem id={'id'} name={'name'} type={type} mimeType={mimeType} />);
			expect(screen.getByTestId(`icon: ${icon}`)).toBeVisible();
			expect(screen.getByTestId(`icon: ${icon}`)).toHaveStyleRule('color', color);
		}
	);

	test('should show thumbnail of gif image with gif format', async () => {
		setup(
			<NodeListItem
				id={'id'}
				name={'name'}
				type={NodeType.Image}
				mimeType={'image/gif'}
				version={1}
			/>
		);
		expect(screen.getByTestId('file-icon-preview')).toHaveStyle({
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
		setup(<NodeListItem id={rootType} name={'name'} type={NodeType.Root} />);
		expect(screen.getByTestId(`icon: ${icon}`)).toBeVisible();
		expect(screen.getByTestId(`icon: ${icon}`)).toHaveStyleRule('color', color);
	});
});
