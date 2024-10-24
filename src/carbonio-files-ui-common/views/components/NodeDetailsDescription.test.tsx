/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';

import { NodeDetailsDescription } from './NodeDetailsDescription';
import { ICON_REGEXP } from '../../constants/test';
import { populateFile } from '../../mocks/mockUtils';
import { generateError, setup, screen } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { File, Folder } from '../../types/graphql/types';
import { canUpsertDescription } from '../../utils/ActionsFactory';
import { mockErrorResolver, mockUpdateNode } from '../../utils/resolverMocks';

describe('NodeDetailsDescription component', () => {
	test('Missing description show missing description label', () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		node.description = '';
		setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText('Click the edit button to add a description')).toBeInTheDocument();
	});

	test('Missing description is not shown if description cannot be edited', () => {
		const node = populateFile();
		node.permissions.can_write_file = false;
		node.description = '';
		setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(
			screen.queryByText('Click the edit button to add a description')
		).not.toBeInTheDocument();
	});

	test('Edit icon disabled if can_write_file is false', () => {
		const node = populateFile();
		node.permissions.can_write_file = false;
		setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();

		const editIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		expect(editIcon).toBeDisabled();
	});

	test('Edit icon not disabled if can_write_file is true', () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();

		const editIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		expect(editIcon).toBeEnabled();
	});

	test('save button is disabled when description is the same', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const newDescription = 'newDescription';

		const { user } = setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText(node.description)).toBeInTheDocument();

		const editIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		expect(editIcon).toBeEnabled();
		await user.click(editIcon);

		const saveIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.save });
		expect(saveIcon).toBeVisible();
		expect(saveIcon).toBeDisabled();

		const inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		expect(saveIcon).toBeEnabled();

		await user.clear(inputField);
		await user.type(inputField, node.description);

		expect(saveIcon).toBeDisabled();
	});

	test('save button is disabled when description has more than 4096 characters', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const newDescription = 'newDescription';
		const moreThan4096Description = faker.string.sample(5000);

		expect(moreThan4096Description.length).toBeGreaterThan(4096);

		const { user } = setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText(node.description)).toBeInTheDocument();

		const editIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		expect(editIcon).toBeEnabled();
		await user.click(editIcon);

		const saveIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.save });
		expect(saveIcon).toBeVisible();
		expect(saveIcon).toBeDisabled();

		const inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		expect(saveIcon).toBeEnabled();

		await user.clear(inputField);
		await user.paste(moreThan4096Description);

		expect(saveIcon).toBeDisabled();
	});

	test('close button do not save changes', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const newDescription = 'newDescription';

		const { user } = setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText(node.description)).toBeInTheDocument();

		let editIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		expect(editIcon).toBeEnabled();
		await user.click(editIcon);

		const saveIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.save });
		expect(saveIcon).toBeVisible();
		expect(saveIcon).toBeDisabled();

		let inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		expect(inputField).toHaveValue(newDescription);

		expect(saveIcon).toBeEnabled();

		const closeICon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close });
		expect(closeICon).toBeVisible();
		await user.click(closeICon);

		editIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		expect(screen.getByText(node.description)).toBeInTheDocument();

		await user.click(editIcon);

		inputField = screen.getByRole('textbox');

		expect(inputField).toHaveValue(node.description);
	});

	test('save button close editing mode and call mutation', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const newDescription = 'newDescription';

		const mocks = {
			Mutation: {
				updateNode: jest.fn(
					mockUpdateNode({
						...node,
						description: newDescription
					}) as (...args: unknown[]) => File | Folder
				)
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks }
		);
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText(node.description)).toBeInTheDocument();

		let editIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		expect(editIcon).toBeEnabled();
		await user.click(editIcon);

		const saveIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.save });
		expect(saveIcon).toBeVisible();
		expect(saveIcon).toBeDisabled();

		const inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		expect(inputField).toHaveValue(newDescription);

		expect(saveIcon).toBeEnabled();

		await user.click(saveIcon);

		editIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();

		expect(saveIcon).not.toBeVisible();

		await waitFor(() => expect(mocks.Mutation.updateNode).toHaveBeenCalled());
		expect(mocks.Mutation.updateNode).toHaveBeenCalledTimes(1);
	});

	test('if save operation throws an error, description input field is shown with last description typed', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const newDescription = 'newDescription';
		const mocks = {
			Mutation: {
				updateNode: mockErrorResolver(generateError('update description error'))
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks }
		);
		expect(screen.getByText(/description/i)).toBeVisible();
		expect(screen.getByText(node.description)).toBeVisible();

		const editIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
		expect(editIcon).toBeVisible();
		await user.click(editIcon);
		const saveIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.save });
		expect(saveIcon).toBeVisible();
		const inputField = screen.getByRole('textbox', {
			name: /maximum length allowed is 4096 characters/i
		});
		await user.clear(inputField);
		await user.type(inputField, newDescription);
		await user.click(saveIcon);
		await screen.findByText(/update description error/i);

		expect(
			screen.getByRole('textbox', { name: /maximum length allowed is 4096 characters/i })
		).toBeVisible();
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.save })).toBeVisible();
		expect(
			screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.edit })
		).not.toBeInTheDocument();
	});
});
