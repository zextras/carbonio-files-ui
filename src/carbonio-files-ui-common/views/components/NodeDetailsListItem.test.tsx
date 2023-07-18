/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';
import { DefaultTheme } from 'styled-components';

import { NodeDetailsListItem } from './NodeDetailsListItem';
import { SELECTORS } from '../../constants/test';
import { populateNode, populateUser } from '../../mocks/mockUtils';
import { NodeType, User } from '../../types/graphql/types';
import { setup } from '../../utils/testUtils';
import { formatDate } from '../../utils/utils';
import 'jest-styled-components';

let mockedUserLogged: User;

beforeEach(() => {
	mockedUserLogged = {
		id: global.mockedUserLogged.id,
		full_name: global.mockedUserLogged.name || '',
		email: faker.internet.email()
	};
});

describe('Node List Item', () => {
	test('render a basic node in the list, logged user is owner', () => {
		const node = populateNode();
		setup(
			<NodeDetailsListItem
				id={node.id}
				name={node.name}
				type={node.type}
				updatedAt={node.updated_at}
				owner={mockedUserLogged}
			/>
		);

		const nodeItem = screen.getByTestId(SELECTORS.detailsNodeItem(node.id));
		expect(nodeItem).toBeInTheDocument();
		expect(nodeItem).toBeVisible();
		expect(nodeItem).not.toBeEmptyDOMElement();
		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.getByText(formatDate(node.updated_at, 'DD/MM/YYYY', 'UTC'))).toBeVisible();
		expect(screen.queryByText(mockedUserLogged.full_name)).not.toBeInTheDocument();
		expect(screen.getByText(/you/i)).toBeVisible();
	});

	test('owner is visible if different from logged user', () => {
		const node = populateNode();
		node.owner = populateUser();
		setup(
			<NodeDetailsListItem
				id={node.id}
				name={node.name}
				type={node.type}
				updatedAt={node.updated_at}
				owner={node.owner}
			/>
		);
		expect(screen.getByText(node.owner.full_name)).toBeVisible();
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
			setup(
				<NodeDetailsListItem
					id={'id'}
					name={'name'}
					type={type}
					updatedAt={Date.now()}
					mimeType={mimeType}
				/>
			);
			expect(screen.getByTestId(`icon: ${icon}`)).toBeVisible();
			expect(screen.getByTestId(`icon: ${icon}`)).toHaveStyleRule('color', color);
		}
	);
});
