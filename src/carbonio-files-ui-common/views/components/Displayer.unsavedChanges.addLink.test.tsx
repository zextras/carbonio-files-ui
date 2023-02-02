/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ApolloError } from '@apollo/client';
import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import { DISPLAYER_TABS } from '../../constants';
import { populateFile, populateLink } from '../../mocks/mockUtils';
import {
	getNodeVariables,
	getSharesVariables,
	mockCreateLink,
	mockCreateLinkError,
	mockGetNode,
	mockGetNodeCollaborationLinks,
	mockGetNodeLinks,
	mockGetShares
} from '../../utils/mockUtils';
import { generateError, getFirstOfNextMonth, setup } from '../../utils/testUtils';
import { formatDate, initExpirationDate } from '../../utils/utils';
import { Displayer } from './Displayer';

describe('Displayer', () => {
	describe('With unsaved changes', () => {
		describe('On add link', () => {
			test('on description input, click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.type(descriptionInput, description);
				await user.click(screen.getByText(/details/i));
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

			test('on expiration date input, click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = getFirstOfNextMonth();
				// always click on first 1 visible on the date picker
				await user.click(screen.getAllByText('1')[0]);
				await screen.findByText(formatDate(chosenDate, 'DD/MM/YYYY'));
				await user.click(screen.getByText(/details/i));
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

			test.skip('cancel action leaves fields valued and navigation is kept on sharing tab', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.type(descriptionInput, description);
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = formatDate(getFirstOfNextMonth(), 'DD/MM/YYYY');
				// always click on first 1 visible on the date picker
				await user.click(screen.getAllByText('1')[0]);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /cancel/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				expect(actionButton).not.toBeInTheDocument();
				expect(screen.getByRole('textbox', { name: /link's description/i })).toHaveDisplayValue(
					description
				);
				expect(screen.getByText(chosenDate)).toBeVisible();
			});

			test.skip('leave anyway action reset fields and continue navigation', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				let descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.type(descriptionInput, description);
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = formatDate(getFirstOfNextMonth(), 'DD/MM/YYYY');
				// always click on first 1 visible on the date picker
				await user.click(screen.getAllByText('1')[0]);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /leave anyway/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				expect(actionButton).not.toBeInTheDocument();
				await screen.findByText(/description/i);
				expect(screen.queryByText(/public link/i)).not.toBeInTheDocument();
				// go back to sharing tab
				await user.click(screen.getByText(/sharing/i));
				// add link status is reset
				expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
				expect(
					screen.queryByRole('textbox', { name: /link's description/i })
				).not.toBeInTheDocument();
				expect(screen.queryByText(description)).not.toBeInTheDocument();
				expect(screen.queryByText(chosenDate)).not.toBeInTheDocument();
				// add a new link
				await user.click(screen.getByRole('button', { name: /add link/i }));
				descriptionInput = await screen.findByRole('textbox', { name: /link's description/i });
				// new link fields are cleaned
				expect(descriptionInput).not.toHaveDisplayValue(description);
				expect(screen.queryByText(chosenDate)).not.toBeInTheDocument();
			});

			test.skip('save and leave action create link and continue navigation', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.lines(1);
				const firstOfNextMonth = getFirstOfNextMonth();
				const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
				const link = populateLink(node);
				link.description = description;
				link.expires_at = expiresAt?.getTime();
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockCreateLink(
						{ node_id: node.id, description: link.description, expires_at: link.expires_at },
						link
					)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				let descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.type(descriptionInput, description);
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = formatDate(firstOfNextMonth, 'DD/MM/YYYY');
				// always click on first 1 visible on the date picker
				await user.click(screen.getAllByText('1')[0]);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /save and leave/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				await screen.findByText(/New public Link generated/i);
				await screen.findByText(/description/i);
				// go back to sharing tab
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(link.url as string);
				// new link has been created
				expect(screen.getByText(link.description)).toBeVisible();
				const expiresOnDate = formatDate(
					new Date(
						firstOfNextMonth.getFullYear(),
						firstOfNextMonth.getMonth(),
						firstOfNextMonth.getDate(),
						23,
						59
					),
					'DD/MM/YY HH:mm'
				);
				const expiresOnRegexp = RegExp(`expires on: ${expiresOnDate}`, 'i');
				expect(screen.getByText(expiresOnRegexp)).toBeVisible();
				expect(screen.getByRole('button', { name: /revoke/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /edit/i })).toBeVisible();
				// add link status is reset
				expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
				expect(
					screen.queryByRole('textbox', { name: /link's description/i })
				).not.toBeInTheDocument();
				// add a new link
				await user.click(screen.getByRole('button', { name: /add link/i }));
				descriptionInput = await screen.findByRole('textbox', { name: /link's description/i });
				// new link fields are cleaned
				expect(descriptionInput).not.toHaveDisplayValue(description);
				expect(screen.queryByText(chosenDate)).not.toBeInTheDocument();
			}, 60000);

			test.skip('save and leave action with errors leaves fields valued and navigation is kept on sharing tab', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.lines(1);
				const firstOfNextMonth = getFirstOfNextMonth();
				const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
				const link = populateLink(node);
				link.description = description;
				link.expires_at = expiresAt?.getTime();
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockCreateLinkError(
						{
							node_id: node.id,
							description: link.description,
							expires_at: link.expires_at
						},
						new ApolloError({ graphQLErrors: [generateError('create link error')] })
					)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.type(descriptionInput, description);
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = formatDate(firstOfNextMonth, 'DD/MM/YYYY');
				// always click on first 1 visible on the date picker
				await user.click(screen.getAllByText('1')[0]);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /save and leave/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				await screen.findByText(/create link error/i);
				expect(actionButton).not.toBeInTheDocument();
				expect(screen.getByRole('textbox', { name: /link's description/i })).toHaveDisplayValue(
					description
				);
				expect(screen.getByText(chosenDate)).toBeVisible();
			});
		});
	});
});
