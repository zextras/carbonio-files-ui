/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';
import { format } from 'date-fns';
import { act } from 'react-dom/test-utils';

import { Displayer } from './Displayer';
import { DATE_FORMAT, DISPLAYER_TABS } from '../../constants';
import { ICON_REGEXP } from '../../constants/test';
import { populateLink, populateNode } from '../../mocks/mockUtils';
import { generateError, getFirstOfNextMonth, setup } from '../../tests/utils';
import { Node } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import {
	mockCreateLink,
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockErrorResolver
} from '../../utils/resolverMocks';
import { formatDate, initExpirationDate } from '../../utils/utils';

describe('Displayer', () => {
	describe('With unsaved changes', () => {
		describe.each<[Node['__typename'], string, string, string]>([
			[
				'File',
				'Public download links',
				'Internal and external users that have access to the link can download the item.',
				'New Public download link generated'
			],
			[
				'Folder',
				'Public access links',
				'Anyone with this link can view and download the content of this folder.',
				'New Public access link generated'
			]
		])('On add link for %s', (nodeType, title, desc, snackbarMsg) => {
			test('on description input, click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});
				await screen.findByText(title);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.click(descriptionInput);
				await user.paste(description);
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
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});
				await screen.findByText(title);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = getFirstOfNextMonth();
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(chosenDate, 'PPPP'), 'i') })
				);
				await screen.findByText(formatDate(chosenDate, DATE_FORMAT));
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

			test('cancel action leaves fields valued and navigation is kept on sharing tab', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(title);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.click(descriptionInput);
				await user.paste(description);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = getFirstOfNextMonth();
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(chosenDate, 'PPPP'), 'i') })
				);
				await screen.findByText(formatDate(chosenDate, DATE_FORMAT));
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				const actionButton = screen.getByRole('button', { name: /cancel/i });
				await user.click(actionButton);
				expect(actionButton).not.toBeInTheDocument();
				expect(screen.getByRole('textbox', { name: /link's description/i })).toHaveDisplayValue(
					description
				);
				expect(screen.getByText(formatDate(chosenDate, DATE_FORMAT))).toBeVisible();
			});

			test('leave anyway action reset fields and continue navigation', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(title);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				let descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.click(descriptionInput);
				await user.paste(description);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = getFirstOfNextMonth();
				const chosenDateFormatted = formatDate(chosenDate, DATE_FORMAT);
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(chosenDate, 'PPPP'), 'i') })
				);
				await screen.findByText(chosenDateFormatted);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				const actionButton = screen.getByRole('button', { name: /leave anyway/i });
				await user.click(actionButton);
				await screen.findByText(/description/i);
				expect(actionButton).not.toBeInTheDocument();
				expect(screen.queryByText(/public link/i)).not.toBeInTheDocument();
				// go back to sharing tab
				await user.click(screen.getByText(/sharing/i));
				// add link status is reset
				expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
				expect(
					screen.queryByRole('textbox', { name: /link's description/i })
				).not.toBeInTheDocument();
				expect(screen.queryByText(description)).not.toBeInTheDocument();
				expect(screen.queryByText(chosenDateFormatted)).not.toBeInTheDocument();
				// add a new link
				await user.click(screen.getByRole('button', { name: /add link/i }));
				descriptionInput = await screen.findByRole('textbox', { name: /link's description/i });
				// new link fields are cleaned
				expect(descriptionInput).not.toHaveDisplayValue(description);
				expect(screen.queryByText(chosenDateFormatted)).not.toBeInTheDocument();
			});

			test('save and leave action create link and continue navigation', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.lines(1);
				const firstOfNextMonth = getFirstOfNextMonth();
				const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
				const link = populateLink(node);
				link.description = description;
				link.expires_at = expiresAt?.getTime();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						createLink: mockCreateLink(link)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(title);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				let descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.click(descriptionInput);
				await user.paste(description);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = formatDate(firstOfNextMonth, DATE_FORMAT);
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(firstOfNextMonth, 'PPPP'), 'i') })
				);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				const actionButton = screen.getByRole('button', { name: /save and leave/i });
				await user.click(actionButton);
				await screen.findByText(snackbarMsg);
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

			test('save and leave action with errors leaves fields valued and navigation is kept on sharing tab', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.lines(1);
				const firstOfNextMonth = getFirstOfNextMonth();
				const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
				const link = populateLink(node);
				link.description = description;
				link.expires_at = expiresAt?.getTime();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						createLink: mockErrorResolver(generateError('create link error'))
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(title);
				await user.click(screen.getByRole('button', { name: /add link/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.click(descriptionInput);
				await user.paste(description);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = formatDate(firstOfNextMonth, DATE_FORMAT);
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(firstOfNextMonth, 'PPPP'), 'i') })
				);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				const actionButton = screen.getByRole('button', { name: /save and leave/i });
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
