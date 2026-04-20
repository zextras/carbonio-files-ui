/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';

import { NodeDetailsDescription } from './NodeDetailsDescription';
import { populateFile } from '../../mocks/mockUtils';
import { generateError, setup, screen } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { File, Folder } from '../../types/graphql/types';
import { canUpsertDescription } from '../../utils/ActionsFactory';
import { mockErrorResolver, mockUpdateNode } from '../../utils/resolverMocks';

describe('NodeDetailsDescription component', () => {
	it('should render description section', () => {
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

		expect(screen.getAllByText('Description')[0]).toBeVisible();
		expect(screen.getByRole('textbox', { name: 'Description' })).toBeVisible();
	});

	it('should render TextArea as readOnly when description cannot be edited', () => {
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

		expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
	});

	it('should render TextArea as editable when can_write_file is true', () => {
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

		expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');
	});

	it('should show Cancel and Save buttons only when description changes and hide them when restored to original', async () => {
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

		expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();

		const inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		const saveButton = screen.getByRole('button', { name: /save/i });
		expect(saveButton).toBeVisible();
		expect(saveButton).toBeEnabled();
		expect(screen.getByRole('button', { name: /cancel/i })).toBeVisible();

		await user.clear(inputField);
		await user.type(inputField, node.description);

		expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
	});

	it('should disable Save button when description has more than 1024 characters', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const newDescription = 'newDescription';
		const moreThan1024Description = faker.string.sample(2000);

		expect(moreThan1024Description.length).toBeGreaterThan(1024);

		const { user } = setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);

		const inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		const saveButton = screen.getByRole('button', { name: /save/i });
		expect(saveButton).toBeEnabled();

		await user.clear(inputField);
		await user.paste(moreThan1024Description);

		expect(saveButton).toBeDisabled();
	});

	it('should render "Maximum length allowed is 1024 characters" text when textarea is focused', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		node.description = '';

		const { user } = setup(
			<NodeDetailsDescription
				id={node.id}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
			/>,
			{ mocks: {} }
		);

		const inputField = screen.getByRole('textbox', { name: 'Description' });

		expect(
			screen.queryByText(/maximum length allowed is 1024 characters/i)
		).not.toBeInTheDocument();

		await user.click(inputField);

		expect(screen.getByText(/maximum length allowed is 1024 characters/i)).toBeVisible();

		await user.tab();

		expect(
			screen.queryByText(/maximum length allowed is 1024 characters/i)
		).not.toBeInTheDocument();
	});

	it('should discard changes and restore original value when Cancel button is clicked', async () => {
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

		const inputField = screen.getByRole('textbox');
		expect(inputField).toHaveValue(node.description);

		await user.clear(inputField);
		await user.type(inputField, newDescription);

		expect(inputField).toHaveValue(newDescription);

		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await user.click(cancelButton);

		// Value restored, buttons gone
		expect(inputField).toHaveValue(node.description);
		expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
	});

	it('should call mutation when Save button is clicked', async () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const newDescription = 'newDescription';

		const mocks = {
			Mutation: {
				updateNode: vi.fn(
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

		const inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		expect(inputField).toHaveValue(newDescription);

		const saveButton = screen.getByRole('button', { name: /save/i });
		expect(saveButton).toBeEnabled();

		await user.click(saveButton);

		await waitFor(() => expect(mocks.Mutation.updateNode).toHaveBeenCalled());
		expect(mocks.Mutation.updateNode).toHaveBeenCalledTimes(1);
	});

	it('should keep description textarea visible with last typed value if save operation throws an error', async () => {
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
		expect(screen.getAllByText('Description')[0]).toBeVisible();

		const inputField = screen.getByRole('textbox');
		await user.clear(inputField);
		await user.type(inputField, newDescription);

		const saveButton = screen.getByRole('button', { name: /save/i });
		await user.click(saveButton);

		await screen.findByText(/update description error/i);

		// TextArea still visible with the typed value
		expect(screen.getByRole('textbox')).toBeVisible();
		expect(screen.getByRole('textbox')).toHaveValue(newDescription);
	});
});
