/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ApolloError } from '@apollo/client';
import { faker } from '@faker-js/faker';
import { screen, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import { DISPLAYER_TABS } from '../../constants';
import {
	populateGalContact,
	populateNode,
	populateShare,
	populateUser
} from '../../mocks/mockUtils';
import { SharePermission } from '../../types/graphql/types';
import {
	getNodeVariables,
	getSharesVariables,
	mockCreateShare,
	mockCreateShareError,
	mockGetAccountByEmail,
	mockGetNode,
	mockGetNodeCollaborationLinks,
	mockGetNodeLinks,
	mockGetShares
} from '../../utils/mockUtils';
import { generateError, setup } from '../../utils/testUtils';
import { Displayer } from './Displayer';

const mockedSoapFetch: jest.Mock = jest.fn();

jest.mock('../../../network/network', () => ({
	soapFetch: (): Promise<unknown> =>
		new Promise((resolve, reject) => {
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
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockGetAccountByEmail({ email: userAccount.email }, userAccount)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId('add-shares-input-container')).findByTestId(
					'icon: EyeOutline'
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

			// TODO: re-enable when custom message field will be available again
			test.skip('on custom message field, click on other tab show dialog to warn user about unsaved changes not savable', async () => {
				const node = populateNode();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const customText = faker.lorem.words();
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

				const input = await screen.findByRole('textbox', {
					name: /add a custom message to this notification/i
				});
				await user.type(input, customText);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/some changes cannot be saved/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				expect(screen.getByText(/some changes cannot be saved/i)).toBeVisible();
				expect(screen.getByText(/Do you want to leave the page without saving\?/i)).toBeVisible();
				expect(screen.getByText(/All unsaved changes will be lost/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /cancel/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /leave anyway/i })).toBeVisible();
				expect(screen.queryByRole('button', { name: /save and leave/i })).not.toBeInTheDocument();
			});

			// TODO: re-enable when custom message field will be available again
			test.skip('with both fields valued, click on other tab show dialog to warn user about unsaved changes', async () => {
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
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockGetAccountByEmail({ email: userAccount.email }, userAccount)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId('add-shares-input-container')).findByTestId(
					'icon: EyeOutline'
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
				expect(screen.getByText(/you have unsaved changes/i)).toBeVisible();
				expect(screen.getByText(/Do you want to leave the page without saving\?/i)).toBeVisible();
				expect(screen.getByText(/All unsaved changes will be lost/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /cancel/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /leave anyway/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /save and leave/i })).toBeVisible();
			});

			test.skip('cancel action leaves fields valued and navigation is kept on sharing tab', async () => {
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
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockGetAccountByEmail({ email: userAccount.email }, userAccount)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId('add-shares-input-container')).findByTestId(
					'icon: EyeOutline'
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
				const actionButton = screen.getByRole('button', { name: /cancel/i });
				expect(actionButton).toBeVisible();
				await user.click(actionButton);
				expect(actionButton).not.toBeInTheDocument();
				expect(screen.getByText(userAccount.full_name)).toBeVisible();
				expect(
					within(screen.getByTestId('add-shares-input-container')).getByTestId('icon: EyeOutline')
				).toBeVisible();
				expect(
					screen.getByRole('textbox', { name: /add a custom message to this notification/i })
				).toHaveDisplayValue(customText);
				expect(screen.getByRole('button', { name: /share/i })).not.toHaveAttribute('disabled', '');
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
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockGetAccountByEmail({ email: userAccount.email }, userAccount)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId('add-shares-input-container')).findByTestId(
					'icon: EyeOutline'
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
				const sharesInputContainer = screen.getByTestId('add-shares-input-container');
				expect(
					within(sharesInputContainer).queryByTestId('icon: EyeOutline')
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole('textbox', { name: /add a custom message to this notification/i })
				).not.toHaveDisplayValue(customText);
				expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
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
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockGetAccountByEmail({ email: userAccount.email }, userAccount),
					mockCreateShare(
						{
							node_id: node.id,
							share_target_id: userAccount.id,
							permission: SharePermission.ReadOnly,
							custom_message: customText
						},
						share
					)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				const chipInput = await screen.findByRole('textbox', { name: /add new people or group/i });
				await user.type(chipInput, userAccount.full_name[0]);
				await screen.findByText(userAccount.email);
				await user.click(screen.getByText(userAccount.email));
				await within(screen.getByTestId('add-shares-input-container')).findByTestId(
					'icon: EyeOutline'
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
				const addSharesContainer = screen.getByTestId('add-shares-input-container');
				expect(
					within(screen.getByTestId('node-sharing-collaborators')).getByTestId('icon: EyeOutline')
				).toBeVisible();
				expect(
					within(addSharesContainer).queryByText(userAccount.full_name)
				).not.toBeInTheDocument();
				expect(
					within(addSharesContainer).queryByTestId('icon: EyeOutline')
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole('textbox', { name: /add a custom message to this notification/i })
				).not.toHaveDisplayValue(customText);
				expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
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
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockGetAccountByEmail({ email: userAccount1.email }, userAccount1),
					mockGetAccountByEmail({ email: userAccount2.email }, userAccount2),
					mockCreateShare(
						{
							node_id: node.id,
							permission: SharePermission.ReadAndWrite,
							share_target_id: userAccount1.id,
							custom_message: customText
						},
						share1
					),
					mockCreateShareError(
						{
							node_id: node.id,
							permission: SharePermission.ReadOnly,
							share_target_id: userAccount2.id,
							custom_message: customText
						},
						new ApolloError({ graphQLErrors: [generateError('create error')] })
					)
				];

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
					screen.getByTestId('add-shares-input-container')
				).findByTestId('icon: EyeOutline');
				expect(screen.queryByText(userAccount1.email)).not.toBeInTheDocument();
				// change to edit permission to be fully distinguishable
				await user.click(editShareItem);
				await screen.findByText(/editor/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				const nodeSharingArea = screen.getByTestId('node-sharing-collaborators');
				await user.click(screen.getByText(/editor/i));
				await within(nodeSharingArea).findByTestId('icon: Edit2Outline');
				// close popover by clicking on the chip label
				await user.click(screen.getByText(userAccount1.full_name));
				expect(screen.queryByTestId('icon: Eye2Outline')).not.toBeInTheDocument();
				// add second share
				await user.type(chipInput, userAccount2.full_name[0]);
				await screen.findByText(userAccount2.email);
				await user.click(screen.getByText(userAccount2.email));
				await within(screen.getByTestId('add-shares-input-container')).findByTestId(
					'icon: EyeOutline'
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
				const addSharesContainer = screen.getByTestId('add-shares-input-container');
				// share 1 has been created
				expect(screen.getByText(userAccount1.full_name)).toBeVisible();
				expect(
					within(screen.getByTestId('node-sharing-collaborators')).getByTestId('icon: Edit2Outline')
				).toBeVisible();
				expect(
					within(addSharesContainer).queryByText(userAccount1.full_name)
				).not.toBeInTheDocument();
				expect(
					within(addSharesContainer).queryByTestId('icon: Edit2Outline')
				).not.toBeInTheDocument();
				// share 2 is still inside add share chip input
				expect(within(addSharesContainer).getByText(userAccount2.full_name)).toBeVisible();
				expect(within(addSharesContainer).getByTestId('icon: EyeOutline')).toBeVisible();
				// custom message input field is valued with the custom text
				expect(
					screen.getByRole('textbox', { name: /add a custom message to this notification/i })
				).toHaveDisplayValue(customText);
				// share button is enabled
				expect(screen.getByRole('button', { name: /share/i })).not.toHaveAttribute('disabled', '');
			});
		});
	});
});
