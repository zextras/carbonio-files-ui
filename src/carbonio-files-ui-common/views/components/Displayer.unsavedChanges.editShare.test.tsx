/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ApolloError } from '@apollo/client';
import { screen, waitFor, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import { DISPLAYER_TABS } from '../../constants';
import { populateNode, populateShare, populateUser } from '../../mocks/mockUtils';
import { SharePermission } from '../../types/graphql/types';
import {
	getNodeVariables,
	getSharesVariables,
	mockGetNode,
	mockGetNodeCollaborationLinks,
	mockGetNodeLinks,
	mockGetShares,
	mockUpdateShare,
	mockUpdateShareError
} from '../../utils/mockUtils';
import { generateError, setup } from '../../utils/testUtils';
import { getChipLabel } from '../../utils/utils';
import { Displayer } from './Displayer';

describe('Displayer', () => {
	describe('With unsaved changes', () => {
		describe('on edit share chip', () => {
			test('click on other tab show dialog to warn user about unsaved changes', async () => {
				const node = populateNode();
				const share = populateShare(node, 'share1');
				share.permission = SharePermission.ReadOnly;
				node.shares = [share];
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

				await screen.findByText(getChipLabel(share.share_target));
				const editShareItem = within(screen.getByTestId('node-sharing-collaborators')).getByTestId(
					'icon: EyeOutline'
				);
				expect(editShareItem).toBeVisible();
				await user.click(editShareItem);
				await screen.findByText(/viewer/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				await user.click(screen.getByText(/editor/i));
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /save/i })).not.toHaveAttribute('disabled', '')
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
				// popover of the chip is closed
				expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
				expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
			});

			test.skip('cancel action leaves permissions unsaved and navigation is kept on sharing tab', async () => {
				const node = populateNode();
				const share = populateShare(node, 'share1');
				share.permission = SharePermission.ReadOnly;
				node.shares = [share];
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

				await screen.findByText(getChipLabel(share.share_target));
				const editShareItem = within(screen.getByTestId('node-sharing-collaborators')).getByTestId(
					'icon: EyeOutline'
				);
				expect(editShareItem).toBeVisible();
				await user.click(editShareItem);
				await screen.findByText(/viewer/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				await user.click(screen.getByText(/editor/i));
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /save/i })).not.toHaveAttribute('disabled', '')
				);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				expect(screen.getByText(/you have unsaved changes/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /cancel/i })).toBeVisible();
				// popover of the chip is closed
				expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
				expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
				await user.click(screen.getByRole('button', { name: /cancel/i }));
				// modal is closed, unsaved changes are still present inside the popover
				expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
				expect(screen.getByText(getChipLabel(share.share_target))).toBeVisible();
				await user.click(editShareItem);
				await screen.findByText(/viewer/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				expect(screen.getByRole('button', { name: /save/i })).not.toHaveAttribute('disabled', '');
			});

			test.skip('leave anyway continue with navigation and does not save the permissions', async () => {
				const node = populateNode();
				const share = populateShare(node, 'share1');
				share.permission = SharePermission.ReadOnly;
				node.shares = [share];
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

				await screen.findByText(getChipLabel(share.share_target));
				const editShareItem = within(screen.getByTestId('node-sharing-collaborators')).getByTestId(
					'icon: EyeOutline'
				);
				expect(editShareItem).toBeVisible();
				await user.click(editShareItem);
				await screen.findByText(/viewer/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				await user.click(screen.getByText(/editor/i));
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /save/i })).not.toHaveAttribute('disabled', '')
				);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				expect(screen.getByText(/you have unsaved changes/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /leave anyway/i })).toBeVisible();
				// popover of the chip is closed
				expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
				expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
				await user.click(screen.getByRole('button', { name: /leave anyway/i }));
				// tab is changed, modal is closed
				await screen.findByText(/description/i);
				expect(screen.queryByRole('button', { name: /leave anyway/i })).not.toBeInTheDocument();
				expect(screen.queryByText(getChipLabel(share.share_target))).not.toBeInTheDocument();
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(getChipLabel(share.share_target));
				// chip permissions are not changed
				const editShareItem2 = within(screen.getByTestId('node-sharing-collaborators')).getByTestId(
					'icon: EyeOutline'
				);
				expect(editShareItem2).toBeVisible();
				await user.click(editShareItem2);
				await screen.findByText(/viewer/i);
				// save button is disabled because permissions are reset
				expect(screen.getByRole('button', { name: /save/i })).toHaveAttribute('disabled', '');
			});

			test.skip('save and leave continue with navigation and save the new permissions', async () => {
				const node = populateNode();
				const shareTarget = populateUser();
				const share = populateShare(node, 'share1', shareTarget);
				share.permission = SharePermission.ReadOnly;
				node.shares = [share];
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockUpdateShare(
						{
							node_id: node.id,
							share_target_id: shareTarget.id,
							permission: SharePermission.ReadAndWrite
						},
						{ ...share, permission: SharePermission.ReadAndWrite }
					)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(getChipLabel(share.share_target));
				const editShareItem = within(screen.getByTestId('node-sharing-collaborators')).getByTestId(
					'icon: EyeOutline'
				);
				expect(editShareItem).toBeVisible();
				await user.click(editShareItem);
				await screen.findByText(/viewer/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				await user.click(screen.getByText(/editor/i));
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /save/i })).not.toHaveAttribute('disabled', '')
				);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				expect(screen.getByText(/you have unsaved changes/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /save and leave/i })).toBeVisible();
				// popover of the chip is closed
				expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
				expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
				await user.click(screen.getByRole('button', { name: /save and leave/i }));
				// tab is changed, modal is closed
				await screen.findByText(/description/i);
				expect(screen.queryByRole('button', { name: /save and leave/i })).not.toBeInTheDocument();
				expect(screen.queryByText(getChipLabel(share.share_target))).not.toBeInTheDocument();
				await user.click(screen.getByText(/sharing/i));
				await screen.findByText(getChipLabel(share.share_target));
				// chip permissions are changed
				const editShareItem2 = within(screen.getByTestId('node-sharing-collaborators')).getByTestId(
					'icon: Edit2Outline'
				);
				expect(editShareItem2).toBeVisible();
				await user.click(editShareItem2);
				await screen.findByText(/viewer/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				// save button is disabled because permissions are updated and saved
				expect(screen.getByRole('button', { name: /save/i })).toHaveAttribute('disabled', '');
			});

			test.skip('save and leave with error keeps navigation on sharing tab', async () => {
				const node = populateNode();
				const shareTarget = populateUser();
				const share = populateShare(node, 'share1', shareTarget);
				share.permission = SharePermission.ReadOnly;
				node.shares = [share];
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const mocks = [
					mockGetNode(getNodeVariables(node.id), node),
					mockGetShares(getSharesVariables(node.id), node),
					mockGetNodeLinks({ node_id: node.id }, node),
					mockGetNodeCollaborationLinks({ node_id: node.id }, node),
					mockUpdateShareError(
						{
							node_id: node.id,
							share_target_id: shareTarget.id,
							permission: SharePermission.ReadAndWrite
						},
						new ApolloError({ graphQLErrors: [generateError('update error')] })
					)
				];

				const { user } = setup(<Displayer translationKey="No.node" />, {
					initialRouterEntries: [`/?node=${node.id}&tab=${DISPLAYER_TABS.sharing}`],
					mocks
				});

				await screen.findByText(getChipLabel(share.share_target));
				const nodeSharingArea = screen.getByTestId('node-sharing-collaborators');
				const editShareItem = within(nodeSharingArea).getByTestId('icon: EyeOutline');
				expect(editShareItem).toBeVisible();
				await user.click(editShareItem);
				await screen.findByText(/viewer/i);
				act(() => {
					// run timers of popover
					jest.runOnlyPendingTimers();
				});
				await user.click(screen.getByText(/editor/i));
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /save/i })).not.toHaveAttribute('disabled', '')
				);
				await user.click(screen.getByText(/details/i));
				await screen.findByText(/you have unsaved changes/i);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				expect(screen.getByText(/you have unsaved changes/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /save and leave/i })).toBeVisible();
				// popover of the chip is closed
				expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
				expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
				await user.click(screen.getByRole('button', { name: /save and leave/i }));
				// error snackbar is shown
				await screen.findByText(/update error/i);
				// modal is closed, sharing tab is kept open, unsaved changes are still present inside the popover
				expect(screen.queryByRole('button', { name: /save and leave/i })).not.toBeInTheDocument();
				expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
				expect(screen.getByText(getChipLabel(share.share_target))).toBeVisible();
				expect(editShareItem).toBeVisible();
				expect(within(nodeSharingArea).queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
				await user.click(editShareItem);
				await screen.findByText(/viewer/i);
				expect(screen.getByRole('button', { name: /save/i })).not.toHaveAttribute('disabled', '');
			});
		});
	});
});
