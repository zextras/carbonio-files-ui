/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';

import { Displayer } from './Displayer';
import * as actualNetworkModule from '../../../network/network';
import { DISPLAYER_TABS } from '../../constants';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import {
	populateGalContact,
	populateNode,
	populateShare,
	populateUser
} from '../../mocks/mockUtils';
import { generateError, setup, screen, within } from '../../tests/utils';
import { MutationResolvers, Resolvers } from '../../types/graphql/resolvers-types';
import { SharePermission } from '../../types/graphql/types';
import {
	mockCreateShare,
	mockGetAccountByEmail,
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks
} from '../../utils/resolverMocks';

jest.mock('./DisplayerActions');

const mockedSoapFetch = jest.fn();

jest.mock<typeof import('../../../network/network')>('../../../network/network', () => ({
	soapFetch: <Req, Res extends Record<string, unknown>>(): ReturnType<
		typeof actualNetworkModule.soapFetch<Req, Res>
	> =>
		new Promise<Res>((resolve, reject) => {
			const result = mockedSoapFetch();
			result ? resolve(result) : reject(new Error('no result provided'));
		})
}));

describe('Displayer', () => {
	describe('With unsaved changes', () => {
		describe('On add share', () => {
			test('on chip input field, click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateNode();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const userAccount = populateUser();
				// set email to lowercase to be compatible with the contacts regexp
				userAccount.email = userAccount.email.toLowerCase();
				// mock soap fetch implementation
				mockedSoapFetch.mockReturnValue({
					match: [populateGalContact(userAccount.full_name, userAccount.email)]
				});
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([]),
						getAccountByEmail: mockGetAccountByEmail(userAccount)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId(SELECTORS.addShareInputContainer)).findByTestId(
					ICON_REGEXP.shareCanRead
				);
				expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
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
				const node = populateNode();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const userAccount = populateUser();
				// set email to lowercase to be compatible with the contacts regexp
				userAccount.email = userAccount.email.toLowerCase();
				// mock soap fetch implementation
				mockedSoapFetch.mockReturnValue({
					match: [populateGalContact(userAccount.full_name, userAccount.email)]
				});
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([]),
						getAccountByEmail: mockGetAccountByEmail(userAccount)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId(SELECTORS.addShareInputContainer)).findByTestId(
					ICON_REGEXP.shareCanRead
				);
				expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
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
				expect(screen.getByText(userAccount.full_name)).toBeVisible();
				expect(
					within(screen.getByTestId(SELECTORS.addShareInputContainer)).getByTestId(
						ICON_REGEXP.shareCanRead
					)
				).toBeVisible();
				expect(screen.getByRole('button', { name: /share/i })).toBeEnabled();
			});

			test.skip('leave anyway action reset fields and continue navigation', async () => {
				const node = populateNode();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const customText = faker.lorem.words();
				const userAccount = populateUser();
				// set email to lowercase to be compatible with the contacts regexp
				userAccount.email = userAccount.email.toLowerCase();
				// mock soap fetch implementation
				mockedSoapFetch.mockReturnValue({
					match: [populateGalContact(userAccount.full_name, userAccount.email)]
				});
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([]),
						getAccountByEmail: mockGetAccountByEmail(userAccount)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId(SELECTORS.addShareInputContainer)).findByTestId(
					ICON_REGEXP.shareCanRead
				);
				expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
				await user.type(
					screen.getByRole('textbox', { name: /add a custom message to this notification/i }),
					customText
				);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /leave anyway/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				// tab is changed
				await screen.findByText(/description/i);
				expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
				// modal is closed
				expect(actionButton).not.toBeInTheDocument();
				// going back to sharing tab, fields are empty
				await user.click(screen.getByText(/sharing/i));
				await screen.findByRole('button', { name: /share/i });
				expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
				const sharesInputContainer = screen.getByTestId(SELECTORS.addShareInputContainer);
				expect(
					within(sharesInputContainer).queryByTestId(ICON_REGEXP.shareCanRead)
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole('textbox', { name: /add a custom message to this notification/i })
				).not.toHaveDisplayValue(customText);
				expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
			});

			test.skip('save and leave action create shares and continue navigation', async () => {
				const node = populateNode();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const customText = faker.lorem.words();
				const userAccount = populateUser();
				// set email to lowercase to be compatible with the contacts regexp
				userAccount.email = userAccount.email.toLowerCase();
				const share = populateShare(node, 'share1', userAccount);
				share.permission = SharePermission.ReadOnly;
				// mock soap fetch implementation
				mockedSoapFetch.mockReturnValue({
					match: [populateGalContact(userAccount.full_name, userAccount.email)]
				});
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([]),
						getAccountByEmail: mockGetAccountByEmail(userAccount)
					},
					Mutation: {
						createShare: mockCreateShare(share)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId(SELECTORS.addShareInputContainer)).findByTestId(
					ICON_REGEXP.shareCanRead
				);
				expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
				await user.type(
					screen.getByRole('textbox', { name: /add a custom message to this notification/i }),
					customText
				);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /save and leave/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				// tab is changed
				await screen.findByText(/description/i);
				expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
				// modal is closed
				expect(actionButton).not.toBeInTheDocument();
				// going back to sharing tab, fields are empty and the new share is created
				await user.click(screen.getByText(/sharing/i));
				await screen.findByRole('button', { name: /share/i });
				expect(screen.getByText(userAccount.full_name)).toBeVisible();
				const addSharesContainer = screen.getByTestId(SELECTORS.addShareInputContainer);
				expect(
					within(screen.getByTestId(SELECTORS.sharingTabCollaborators)).getByTestId(
						ICON_REGEXP.shareCanRead
					)
				).toBeVisible();
				expect(
					within(addSharesContainer).queryByText(userAccount.full_name)
				).not.toBeInTheDocument();
				expect(
					within(addSharesContainer).queryByTestId(ICON_REGEXP.shareCanRead)
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole('textbox', { name: /add a custom message to this notification/i })
				).not.toHaveDisplayValue(customText);
				expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
			});

			test.skip('save and leave action with errors leaves fields valued with only shares that went in error and navigation is kept on sharing tab', async () => {
				const node = populateNode();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				node.shares = [];
				const customText = faker.lorem.words();
				const userAccount1 = populateUser();
				// set email to lowercase to be compatible with the contacts regexp
				userAccount1.email = userAccount1.email.toLowerCase();
				const share1 = populateShare(node, 'share1', userAccount1);
				const userAccount2 = populateUser();
				userAccount2.email = userAccount2.email.toLowerCase();
				// mock soap fetch implementation
				mockedSoapFetch
					.mockReturnValueOnce({
						match: [populateGalContact(userAccount1.full_name, userAccount1.email)]
					})
					.mockReturnValueOnce({
						match: [populateGalContact(userAccount2.full_name, userAccount2.email)]
					});
				const createShareResolver: MutationResolvers['createShare'] = (parent, args) => {
					if (args.share_target_id === userAccount1.id) {
						return share1;
					}
					throw generateError('create error');
				};
				const mocks = {
					Query: {
						getNode: mockGetNode({ getNode: [node], getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([]),
						getAccountByEmail: mockGetAccountByEmail(userAccount1, userAccount2)
					},
					Mutation: {
						createShare: createShareResolver
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				// add first share
				await user.type(chipInput, userAccount1.full_name[0]);
				await screen.findByText(userAccount1.email);
				await user.click(screen.getByText(userAccount1.email));
				const editShareItem = await within(
					screen.getByTestId(SELECTORS.addShareInputContainer)
				).findByTestId(ICON_REGEXP.shareCanRead);
				expect(screen.queryByText(userAccount1.email)).not.toBeInTheDocument();
				// change to edit permission to be fully distinguishable
				await user.click(editShareItem);
				await screen.findByText(/editor/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				const nodeSharingArea = screen.getByTestId(SELECTORS.sharingTabCollaborators);
				await user.click(screen.getByText(/editor/i));
				await within(nodeSharingArea).findByTestId(ICON_REGEXP.shareCanWrite);
				// close popover by clicking on the chip label
				await user.click(screen.getByText(userAccount1.full_name));
				expect(screen.queryByTestId(ICON_REGEXP.shareCanRead)).not.toBeInTheDocument();
				// add second share
				await user.type(chipInput, userAccount2.full_name[0]);
				await screen.findByText(userAccount2.email);
				await user.click(screen.getByText(userAccount2.email));
				await within(screen.getByTestId(SELECTORS.addShareInputContainer)).findByTestId(
					ICON_REGEXP.shareCanRead
				);
				expect(screen.queryByText(userAccount2.email)).not.toBeInTheDocument();
				await user.type(
					screen.getByRole('textbox', { name: /add a custom message to this notification/i }),
					customText
				);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				const actionButton = screen.getByRole('button', { name: /save and leave/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				// error snackbar is shown
				await screen.findByText(/create error/i);
				// modal is closed
				expect(actionButton).not.toBeInTheDocument();
				// navigation is kept on sharing tab
				expect(screen.getByRole('button', { name: /share/i })).toBeVisible();
				const addSharesContainer = screen.getByTestId(SELECTORS.addShareInputContainer);
				// share 1 has been created
				expect(screen.getByText(userAccount1.full_name)).toBeVisible();
				expect(
					within(screen.getByTestId(SELECTORS.sharingTabCollaborators)).getByTestId(
						ICON_REGEXP.shareCanWrite
					)
				).toBeVisible();
				expect(
					within(addSharesContainer).queryByText(userAccount1.full_name)
				).not.toBeInTheDocument();
				expect(
					within(addSharesContainer).queryByTestId(ICON_REGEXP.shareCanWrite)
				).not.toBeInTheDocument();
				// share 2 is still inside add share chip input
				expect(within(addSharesContainer).getByText(userAccount2.full_name)).toBeVisible();
				expect(within(addSharesContainer).getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
				// custom message input field is valued with the custom text
				expect(
					screen.getByRole('textbox', { name: /add a custom message to this notification/i })
				).toHaveDisplayValue(customText);
				// share button is enabled
				expect(screen.getByRole('button', { name: /share/i })).toBeEnabled();
			});
		});
	});
});
