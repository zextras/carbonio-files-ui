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
import { populateFile, populateLinks } from '../../mocks/mockUtils';
import { Link } from '../../types/graphql/types';
import {
	getNodeVariables,
	getSharesVariables,
	mockGetNode,
	mockGetNodeCollaborationLinks,
	mockGetNodeLinks,
	mockGetShares,
	mockUpdateLink,
	mockUpdateLinkError
} from '../../utils/mockUtils';
import { generateError, getFirstOfNextMonth, setup } from '../../utils/testUtils';
import { formatDate, initExpirationDate } from '../../utils/utils';
import { Displayer } from './Displayer';

describe('Displayer', () => {
	describe('With unsaved changes', () => {
		describe('on edit link', () => {
			test('on description input, click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				node.links = populateLinks(node);
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
				const link = node.links[0] as Link;
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
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
				node.links = populateLinks(node);
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
				const link = node.links[0] as Link;
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = getFirstOfNextMonth(link.expires_at || undefined);
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
				node.links = populateLinks(node);
				const link = node.links[0] as Link;
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
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
				await user.type(descriptionInput, description);
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = formatDate(
					getFirstOfNextMonth(link.expires_at || undefined),
					'DD/MM/YYYY'
				);
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
				node.links = populateLinks(node);
				const link = node.links[0] as Link;
				link.description = faker.lorem.lines(1);
				link.expires_at = faker.date.soon().getTime();
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
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				let descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.type(descriptionInput, description);
				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				// chosen date is the 1st of next month
				const chosenDate = formatDate(getFirstOfNextMonth(link.expires_at), 'DD/MM/YYYY');
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
				expect(screen.getAllByRole('button', { name: /edit/i })[0]).toBeVisible();
				expect(
					screen.queryByRole('textbox', { name: /link's description/i })
				).not.toBeInTheDocument();
				expect(screen.queryByText(description)).not.toBeInTheDocument();
				expect(screen.queryByText(chosenDate)).not.toBeInTheDocument();
				// re-edit the same link
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				descriptionInput = await screen.findByRole('textbox', { name: /link's description/i });
				// new link fields are cleaned
				expect(descriptionInput).toHaveDisplayValue(link.description);
				expect(screen.queryByText(chosenDate)).not.toBeInTheDocument();
				expect(screen.getByText(formatDate(link.expires_at, 'DD/MM/YYYY'))).toBeVisible();
			});

			test.skip('save and leave action update link and continue navigation', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				node.links = populateLinks(node, 1);
				const link = node.links[0] as Link;
				link.description = faker.lorem.lines(1);
				link.expires_at = faker.date.soon().getTime();
				const newDescription = faker.lorem.words();
				const firstOfNextMonth = getFirstOfNextMonth(link.expires_at);
				const newExpiresAt = initExpirationDate(firstOfNextMonth) as Date;
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockUpdateLink(
						{ link_id: link.id, description: newDescription, expires_at: newExpiresAt.getTime() },
						{ ...link, description: newDescription, expires_at: newExpiresAt.getTime() }
					)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await screen.findByText(link.url as string);
				await user.click(screen.getByRole('button', { name: /edit/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
				await user.type(descriptionInput, newDescription);
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
				await screen.findByText(/public link updated/i);
				await screen.findByText(/description/i);
				// go back to sharing tab
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(link.url as string);
				// link has been updated
				expect(screen.getByText(newDescription)).toBeVisible();
				expect(screen.queryByText(link.description)).not.toBeInTheDocument();
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
				// edit link status is reset
				expect(screen.getByRole('button', { name: /revoke/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /edit/i })).toBeVisible();
				expect(
					screen.queryByRole('textbox', { name: /link's description/i })
				).not.toBeInTheDocument();
			});

			test.skip('save and leave action with errors leaves fields valued and navigation is kept on sharing tab', async () => {
				const node = populateFile();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				node.links = populateLinks(node, 1);
				const link = node.links[0] as Link;
				link.description = faker.lorem.lines(1);
				link.expires_at = faker.date.soon().getTime();
				const newDescription = faker.lorem.words();
				const firstOfNextMonth = getFirstOfNextMonth(link.expires_at);
				const newExpiresAt = initExpirationDate(firstOfNextMonth) as Date;
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockUpdateLinkError(
						{ link_id: link.id, description: newDescription, expires_at: newExpiresAt.getTime() },
						new ApolloError({ graphQLErrors: [generateError('update link error')] })
					)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(/public link/i);
				await screen.findByText(link.url as string);
				await user.click(screen.getByRole('button', { name: /edit/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
				await user.type(descriptionInput, newDescription);
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
				await screen.findByText(/update link error/i);
				expect(actionButton).not.toBeInTheDocument();
				expect(screen.getByRole('textbox', { name: /link's description/i })).toHaveDisplayValue(
					newDescription
				);
				expect(screen.getByText(chosenDate)).toBeVisible();
			});
		});
	});
});
