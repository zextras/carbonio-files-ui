/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';

import { populateNode, populateUser } from '../../mocks/mockUtils';
import { User } from '../../types/graphql/types';
import { setup } from '../../utils/testUtils';
import { formatDate } from '../../utils/utils';
import { NodeDetailsListItem } from './NodeDetailsListItem';

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

		const nodeItem = screen.getByTestId(`details-node-item-${node.id}`);
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
});
