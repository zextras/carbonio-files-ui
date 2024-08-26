/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { format } from 'date-fns';

import { Displayer } from './Displayer';
import { DATE_TIME_FORMAT, DISPLAYER_TABS } from '../../constants';
import { ICON_REGEXP } from '../../constants/test';
import { populateLinks, populateNode } from '../../mocks/mockUtils';
import { generateError, getFirstOfNextMonth, setup, screen } from '../../tests/utils';
import { Node } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { Link } from '../../types/graphql/types';
import {
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockUpdateLink,
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
				'Public download link updated'
			],
			[
				'Folder',
				'Public access links',
				'Anyone with this link can view and download the content of this folder.',
				'Public access link updated'
			]
		])('on edit link for a %s', (nodeType, title, desc, snackbarMsg) => {
			test('on description input, click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const description = faker.lorem.words();
				node.links = populateLinks(node);
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
				const link = node.links[0] as Link;
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
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
				node.links = populateLinks(node);
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
				const link = node.links[0] as Link;
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = getFirstOfNextMonth(link.expires_at || undefined);
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(chosenDate, 'PPPP'), 'i') })
				);
				await screen.findByText(formatDate(chosenDate));
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
				node.links = populateLinks(node);
				const link = node.links[0] as Link;
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
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
				await user.click(descriptionInput);
				await user.paste(description);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const firstOfNextMonth = getFirstOfNextMonth(link.expires_at ?? undefined);
				const chosenDate = formatDate(firstOfNextMonth);
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(firstOfNextMonth, 'PPPP'), 'i') })
				);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				const actionButton = screen.getByRole('button', { name: /cancel/i });
				await user.click(actionButton);
				expect(actionButton).not.toBeInTheDocument();
				expect(screen.getByRole('textbox', { name: /link's description/i })).toHaveDisplayValue(
					description
				);
				expect(screen.getByText(chosenDate)).toBeVisible();
			});

			test('leave anyway action reset fields and continue navigation', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				node.links = populateLinks(node);
				const link = node.links[0] as Link;
				link.description = faker.lorem.lines(1);
				link.expires_at = faker.date.soon().getTime();
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
				await screen.findByText(link.url as string);
				await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
				let descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.click(descriptionInput);
				await user.paste(description);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const firstOfNextMonth = getFirstOfNextMonth(link.expires_at);
				const chosenDate = formatDate(firstOfNextMonth);
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(firstOfNextMonth, 'PPPP'), 'i') })
				);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				const actionButton = screen.getByRole('button', { name: /leave anyway/i });
				await user.click(actionButton);
				expect(actionButton).not.toBeInTheDocument();
				await screen.findByText(/description/i);
				expect(screen.queryByText(/public link/i)).not.toBeInTheDocument();
				// go back to sharing tab
				await user.click(screen.getByText(/sharing/i));
				// add link status is reset
				expect((await screen.findAllByRole('button', { name: /edit/i }))[0]).toBeVisible();
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
				expect(screen.getByText(formatDate(link.expires_at))).toBeVisible();
			});

			test('save and leave action update link and continue navigation', async () => {
				const node = populateNode(nodeType);
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
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						updateLink: mockUpdateLink({
							...link,
							description: newDescription,
							expires_at: newExpiresAt.getTime()
						})
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(title);
				await screen.findByText(link.url as string);
				await user.click(screen.getByRole('button', { name: /edit/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
				await user.click(descriptionInput);
				await user.paste(newDescription);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = formatDate(firstOfNextMonth);
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
					undefined,
					DATE_TIME_FORMAT
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

			test('save and leave action with errors leaves fields valued and navigation is kept on sharing tab', async () => {
				const node = populateNode(nodeType);
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				node.links = populateLinks(node, 1);
				const link = node.links[0] as Link;
				link.description = faker.lorem.lines(1);
				link.expires_at = faker.date.soon().getTime();
				const newDescription = faker.lorem.words();
				const firstOfNextMonth = getFirstOfNextMonth(link.expires_at);
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						updateLink: mockErrorResolver(generateError('update link error'))
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(title);
				await screen.findByText(link.url as string);
				await user.click(screen.getByRole('button', { name: /edit/i }));
				const descriptionInput = await screen.findByRole('textbox', {
					name: /link's description/i
				});
				await user.clear(descriptionInput);
				await user.click(descriptionInput);
				await user.paste(newDescription);
				await user.click(screen.getByTestId(ICON_REGEXP.openCalendarPicker));
				await user.click(await screen.findByRole('button', { name: /next month/i }));
				// chosen date is the 1st of next month
				const chosenDate = formatDate(firstOfNextMonth);
				// always click on first 1 visible on the date picker
				await user.click(
					screen.getByRole('option', { name: RegExp(format(firstOfNextMonth, 'PPPP'), 'i') })
				);
				await screen.findByText(chosenDate);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				const actionButton = screen.getByRole('button', { name: /save and leave/i });
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
