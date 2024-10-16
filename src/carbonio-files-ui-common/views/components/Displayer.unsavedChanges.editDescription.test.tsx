/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { waitFor, act } from '@testing-library/react';

import { Displayer } from './Displayer';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFile, populateNode } from '../../mocks/mockUtils';
import { generateError, setup, screen, within } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { NodeType } from '../../types/graphql/types';
import {
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockUpdateNode,
	mockErrorResolver
} from '../../utils/resolverMocks';

describe('Displayer', () => {
	describe('With unsaved changes', () => {
		describe('on description', () => {
			test('click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateNode();
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_share = false;
				const newDescription = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}`],
					mocks
				});
				await screen.findByText(node.description);
				expect(screen.getByText(/details/i)).toBeVisible();
				expect(screen.getByText(/sharing/i)).toBeVisible();
				const editDescriptionItem = within(
					screen.getByTestId(SELECTORS.nodeDetails)
				).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.edit
				});
				expect(editDescriptionItem).toBeVisible();
				await user.click(editDescriptionItem);
				const input = await screen.findByRole('textbox', {
					name: /maximum length allowed is 4096 characters/i
				});
				await user.clear(input);
				await user.type(input, newDescription);
				await waitFor(() => expect(input).toHaveDisplayValue(newDescription));
				const saveButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.save });
				expect(saveButton).toBeVisible();
				expect(saveButton).toBeEnabled();
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				expect(screen.getByText(/you have unsaved changes/i)).toBeVisible();
				expect(screen.getByText(/Do you want to leave the page without saving\?/i)).toBeVisible();
				expect(screen.getByText(/All unsaved changes will be lost/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /cancel/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /leave anyway/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /save and leave/i })).toBeVisible();
			});

			test.skip('cancel action leaves description input field open and valued and navigation is kept on details tab', async () => {
				const node = populateNode();
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_share = false;
				const newDescription = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}`],
					mocks
				});
				await screen.findByText(node.description);
				const editDescriptionItem = within(
					screen.getByTestId(SELECTORS.nodeDetails)
				).getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
				expect(editDescriptionItem).toBeVisible();
				await user.click(editDescriptionItem);
				const input = await screen.findByRole('textbox', {
					name: /maximum length allowed is 4096 characters/i
				});
				await user.clear(input);
				await user.type(input, newDescription);
				await waitFor(() => expect(input).toHaveDisplayValue(newDescription));
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				await user.click(screen.getByRole('button', { name: /cancel/i }));
				expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
				expect(input).toBeVisible();
				expect(input).toHaveDisplayValue(newDescription);
				const saveButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.save });
				expect(saveButton).toBeVisible();
				expect(saveButton).toBeEnabled();
				expect(screen.queryByTestId(ICON_REGEXP.edit)).not.toBeInTheDocument();
			});

			test.skip('leave anyway closes description input field, continue with navigation and does not save the description', async () => {
				const node = populateFile();
				node.type = NodeType.Image;
				node.extension = 'png';
				node.mime_type = 'image/png';
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_share = true;
				node.description = faker.lorem.words();
				const newDescription = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}`],
					mocks
				});

				await screen.findByText(node.description);
				const editDescriptionItem = within(screen.getByTestId(SELECTORS.nodeDetails)).getByTestId(
					ICON_REGEXP.edit
				);
				expect(editDescriptionItem).toBeVisible();
				await user.click(editDescriptionItem);
				const input = await screen.findByRole('textbox', {
					name: /maximum length allowed is 4096 characters/i
				});
				await user.clear(input);
				await user.type(input, newDescription);
				await waitFor(() => expect(input).toHaveDisplayValue(newDescription));
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /leave anyway/i });
				await user.click(actionButton);
				// tab is changed
				await screen.findByRole('button', { name: /share/i });
				expect(screen.queryByRole('button', { name: /leave anyway/i })).not.toBeInTheDocument();
				expect(
					screen.queryByRole('textbox', { name: /maximum length allowed is 4096 characters/i })
				).not.toBeInTheDocument();
				expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
				// go back to details tab
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/description/i);
				expect(screen.getByText(/description/i)).toBeVisible();
				// description input is closed and description has not been updated
				expect(
					screen.queryByRole('textbox', { name: /maximum length allowed is 4096 characters/i })
				).not.toBeInTheDocument();
				expect(screen.queryByTestId(ICON_REGEXP.save)).not.toBeInTheDocument();
				expect(screen.getByTestId(ICON_REGEXP.edit)).toBeVisible();
				expect(screen.getByText(node.description)).toBeVisible();
				expect(screen.queryByText(newDescription)).not.toBeInTheDocument();
				expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
			});

			test.skip('save and leave closes description input field, continue with navigation and save the description', async () => {
				const node = populateNode();
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_share = true;
				const newDescription = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						updateNode: mockUpdateNode({ ...node, description: newDescription })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}`],
					mocks
				});
				await screen.findByText(node.description);
				const editDescriptionItem = within(screen.getByTestId(SELECTORS.nodeDetails)).getByTestId(
					ICON_REGEXP.edit
				);
				expect(editDescriptionItem).toBeVisible();
				await user.click(editDescriptionItem);
				const input = await screen.findByRole('textbox', {
					name: /maximum length allowed is 4096 characters/i
				});
				await user.clear(input);
				await user.type(input, newDescription);
				await waitFor(() => expect(input).toHaveDisplayValue(newDescription));
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(/you have unsaved changes/i);
				await user.click(screen.getByRole('button', { name: /save and leave/i }));
				// tab is changed
				await screen.findByRole('button', { name: /share/i });
				expect(screen.queryByRole('button', { name: /save and leave/i })).not.toBeInTheDocument();
				expect(
					screen.queryByRole('textbox', { name: /maximum length allowed is 4096 characters/i })
				).not.toBeInTheDocument();
				expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
				// go back to details tab
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/description/i);
				expect(screen.getByText(/description/i)).toBeVisible();
				// description input is closed and description has not been updated
				expect(
					screen.queryByRole('textbox', { name: /maximum length allowed is 4096 characters/i })
				).not.toBeInTheDocument();
				expect(screen.queryByTestId(ICON_REGEXP.save)).not.toBeInTheDocument();
				expect(
					within(screen.getByTestId('displayer-content')).getByTestId(ICON_REGEXP.edit)
				).toBeVisible();
				expect(screen.getByText(newDescription)).toBeVisible();
				expect(screen.queryByText(node.description)).not.toBeInTheDocument();
				expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
			});

			test.skip('save and leave with error keeps description input field open and valued and navigation is kept on details tab', async () => {
				const node = populateNode();
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_share = true;
				const newDescription = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node] })
					},
					Mutation: {
						updateNode: mockErrorResolver(generateError('update error'))
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}`],
					mocks
				});
				await screen.findByText(node.description);
				const editDescriptionItem = within(
					screen.getByTestId(SELECTORS.nodeDetails)
				).getByRoleWithIcon('button', { icon: ICON_REGEXP.edit });
				expect(editDescriptionItem).toBeVisible();
				await user.click(editDescriptionItem);
				const input = await screen.findByRole('textbox', {
					name: /maximum length allowed is 4096 characters/i
				});
				await user.clear(input);
				await user.type(input, newDescription);
				await waitFor(() => expect(input).toHaveDisplayValue(newDescription));
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(/you have unsaved changes/i);
				await user.click(screen.getByRole('button', { name: /save and leave/i }));
				// snackbar of the error is shown
				await screen.findByText(/update error/i);
				// navigation is kept on the details tab, with description input field open and valued with new description
				expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
				expect(screen.getByText(/description/i)).toBeVisible();
				// description input is closed and description has not been updated
				expect(
					screen.getByRole('textbox', {
						name: /maximum length allowed is 4096 characters/i
					})
				).toBeVisible();
				expect(
					screen.getByRole('textbox', {
						name: /maximum length allowed is 4096 characters/i
					})
				).toHaveDisplayValue(newDescription);
				expect(screen.queryByText(node.description)).not.toBeInTheDocument();
				const saveButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.save });
				expect(saveButton).toBeVisible();
				expect(saveButton).toBeEnabled();
				expect(screen.queryByTestId(ICON_REGEXP.edit)).not.toBeInTheDocument();
				// modal of unsaved changes is closed
				expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
			});
		});
	});
});
