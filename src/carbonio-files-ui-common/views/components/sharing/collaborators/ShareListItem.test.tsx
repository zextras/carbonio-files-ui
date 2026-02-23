/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, waitFor } from '@testing-library/react';

import { ShareListItem } from './ShareListItem';
import { COLORS, ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import { populateNode, populateShare, populateUser } from '../../../../mocks/mockUtils';
import { screen, setup } from '../../../../tests/utils';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import { Share, SharePermission } from '../../../../types/graphql/types';
import { mockDeleteShares, mockUpdateShares } from '../../../../utils/resolverMocks';

describe('ShareListItem', () => {
	test.each([
		[
			[ICON_REGEXP.shareCanRead, ICON_REGEXP.shareOff],
			SharePermission.ReadOnly,
			{
				can_write_folder: false,
				can_write_file: false,
				can_share: false
			},
			[ICON_REGEXP.edit, ICON_REGEXP.shareCanShare]
		],
		[
			[ICON_REGEXP.edit, ICON_REGEXP.shareOff],
			SharePermission.ReadAndWrite,
			{
				can_write_folder: true,
				can_write_file: true,
				can_share: false
			},
			[ICON_REGEXP.shareCanRead, ICON_REGEXP.shareCanShare]
		],
		[
			[ICON_REGEXP.shareCanRead, ICON_REGEXP.shareCanShare],
			SharePermission.ReadAndShare,
			{
				can_write_folder: false,
				can_write_file: false,
				can_share: true
			},
			[ICON_REGEXP.edit, ICON_REGEXP.shareOff]
		],
		[
			[ICON_REGEXP.edit, ICON_REGEXP.shareCanShare],
			SharePermission.ReadWriteAndShare,
			{
				can_write_folder: true,
				can_write_file: true,
				can_share: true
			},
			[ICON_REGEXP.shareCanRead, ICON_REGEXP.shareOff]
		]
	])(
		'should render the collaborator with %s (share permission: %s)',
		async (iconsVisible, sharePermission, permissions, iconsNotVisible) => {
			const node = populateNode();
			node.permissions = { ...node.permissions, ...permissions };
			const userAccount = populateUser();
			const share = populateShare(node, node.id, userAccount);
			share.permission = sharePermission;
			const deleteShare = vi.fn();
			setup(
				<ShareListItem
					share={share}
					permissions={node.permissions}
					yourself={false}
					deleteShares={deleteShare}
				/>
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			iconsVisible.forEach((iconVisible) => {
				const icon1 = screen.getByRoleWithIcon('button', { icon: iconVisible });
				expect(icon1).toBeVisible();
				if (
					share.permission === SharePermission.ReadOnly ||
					share.permission === SharePermission.ReadAndWrite
				) {
					expect(icon1).toBeDisabled();
				}
				if (
					share.permission === SharePermission.ReadAndShare ||
					share.permission === SharePermission.ReadWriteAndShare
				) {
					expect(icon1).toBeEnabled();
				}
			});

			iconsNotVisible.forEach((iconNotVisible) => {
				expect(
					screen.queryByRoleWithIcon('button', { icon: iconNotVisible })
				).not.toBeInTheDocument();
			});

			const trashIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
			expect(trashIcon).toBeVisible();
			if (
				share.permission === SharePermission.ReadOnly ||
				share.permission === SharePermission.ReadAndWrite
			) {
				expect(trashIcon).toBeDisabled();
			}
			if (
				share.permission === SharePermission.ReadAndShare ||
				share.permission === SharePermission.ReadWriteAndShare
			) {
				expect(trashIcon).toBeEnabled();
			}
		}
	);
});

describe('Share List Item', () => {
	describe('From a node with read and share permissions', () => {
		test('click on edit collaboration button open popover with Editor item disabled', async () => {
			const node = populateNode();
			node.permissions.can_write_folder = false;
			node.permissions.can_write_file = false;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const deleteShare = vi.fn();
			const { user } = setup(
				<ShareListItem
					deleteShares={deleteShare}
					share={share}
					permissions={node.permissions}
					yourself={false}
				/>
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

			await user.click(screen.getByTestId(SELECTORS.exclusiveSelectionEditor));
			expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
		});
	});

	describe('From a node with read write and share permissions', () => {
		test('click on edit collaboration button open popover with all items enabled', async () => {
			const node = populateNode();
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const deleteShare = vi.fn();
			const { user } = setup(
				<ShareListItem
					deleteShares={deleteShare}
					share={share}
					permissions={node.permissions}
					yourself={false}
				/>
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			expect(screen.getByText('Viewer')).toBeVisible();
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByText('Sharing allowed')).toBeVisible();
			expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
			expect(screen.getByText('Viewer')).toHaveStyle({
				color: COLORS.shareChipPopover.active
			});
			expect(screen.getByText('Editor')).toHaveStyle({
				color: COLORS.shareChipPopover.enabled
			});
		});
	});

	test('render the collaborator item of the logged user share. Click on trash action open confirmation modal and then delete share', async () => {
		const node = populateNode();
		const userAccount = populateUser(mockedUserLogged.id, mockedUserLogged.name);
		const share = populateShare(node, 'abc', userAccount);
		const mocks = {
			Mutation: {
				deleteShares: mockDeleteShares(['deleted-id'])
			}
		} satisfies Partial<Resolvers>;
		const deleteShare = vi.fn(() => Promise.resolve({ data: { deleteShares: ['deleted-id'] } }));
		const { user } = setup(
			<ShareListItem
				deleteShares={deleteShare}
				share={share}
				permissions={node.permissions}
				yourself
			/>,
			{
				mocks
			}
		);

		expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		expect(screen.getByText(/you/i)).toBeVisible();
		const trashButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
		expect(trashButton).toBeVisible();
		await user.click(trashButton);
		await screen.findByRole('button', { name: /remove/i });
		// run timers of modal
		act(() => {
			vi.advanceTimersToNextTimer();
		});
		expect(
			screen.getByText(/Are you sure to remove yourself from this collaboration/i)
		).toBeVisible();
		expect(
			screen.getByText(/All the access permission previously given to you will be lost/i)
		).toBeVisible();
		const regexp = RegExp(
			`Are you sure to remove all the access permission previously given to ${userAccount.full_name}?`,
			'i'
		);
		expect(screen.queryByText(regexp)).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /remove/i }));
		expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
		expect(deleteShare).toHaveBeenCalled();
	});

	describe('within popover', () => {
		test('click on other enable save button but does not trigger collaboration update', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;

			const mocks = {
				Mutation: {
					updateShares: vi.fn(mockUpdateShares(share) as unknown as (...args: unknown[]) => Share[])
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = vi.fn();
			const { user } = setup(
				<ShareListItem
					deleteShares={deleteShare}
					share={share}
					permissions={node.permissions}
					yourself={false}
				/>,
				{
					mocks
				}
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			await screen.findByRole('button', { name: /save/i });
			expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
			expect(screen.getByText(/viewer/i)).toBeVisible();
			expect(screen.getByText('Viewer')).toHaveStyle({
				color: COLORS.shareChipPopover.active
			});
			expect(screen.getByText(/editor/i)).toBeVisible();
			expect(screen.getByText('Editor')).toHaveStyle({
				color: COLORS.shareChipPopover.enabled
			});
			await user.click(screen.getByText(/editor/i));
			expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
			expect(mocks.Mutation.updateShares).not.toHaveBeenCalled();
		});

		test('editor entry is disabled if node has not write permissions', async () => {
			const node = populateNode();
			node.permissions.can_write_file = false;
			node.permissions.can_write_folder = false;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const mocks = {
				Mutation: {
					updateShares: vi.fn(mockUpdateShares(share) as unknown as (...args: unknown[]) => Share[])
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = vi.fn();
			const { user } = setup(
				<ShareListItem
					deleteShares={deleteShare}
					share={share}
					permissions={node.permissions}
					yourself={false}
				/>,
				{
					mocks
				}
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			await screen.findByRole('button', { name: /save/i });
			expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
			expect(screen.getByText(/editor/i)).toBeVisible();
			await user.click(screen.getByText(/editor/i));
			expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
			expect(mocks.Mutation.updateShares).not.toHaveBeenCalled();
		});

		test('click on checkbox "sharing allowed" enable save button but does not trigger collaboration update', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const mocks = {
				Mutation: {
					updateShares: vi.fn(mockUpdateShares(share) as unknown as (...args: unknown[]) => Share[])
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = vi.fn();
			const { user } = setup(
				<ShareListItem
					deleteShares={deleteShare}
					share={share}
					permissions={node.permissions}
					yourself={false}
				/>,
				{
					mocks
				}
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			await screen.findByRole('button', { name: /save/i });
			expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
			expect(screen.getByText(/sharing allowed/i)).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.checkboxUnchecked)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.checkboxChecked)).not.toBeInTheDocument();
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeEnabled());
			await screen.findByTestId(ICON_REGEXP.checkboxChecked);
			expect(mocks.Mutation.updateShares).not.toHaveBeenCalled();
			expect(screen.queryByTestId(ICON_REGEXP.checkboxUnchecked)).not.toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.checkboxChecked)).toBeVisible();
		});

		test('click on save trigger collaboration update. Popover is closed', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const mocks = {
				Mutation: {
					updateShares: vi.fn(mockUpdateShares(share) as unknown as (...args: unknown[]) => Share[])
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = vi.fn();
			const { user } = setup(
				<ShareListItem
					deleteShares={deleteShare}
					share={share}
					permissions={node.permissions}
					yourself={false}
				/>,
				{
					mocks
				}
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			await screen.findByRole('button', { name: /save/i });
			expect(screen.getByTestId(ICON_REGEXP.checkboxUnchecked)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeEnabled());
			await screen.findByTestId(ICON_REGEXP.checkboxChecked);
			await user.click(screen.getByText(/editor/i));
			await user.click(screen.getByRole('button', { name: /save/i }));
			await waitFor(() => expect(mocks.Mutation.updateShares).toHaveBeenCalled());
			expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
			expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
		});

		test('should render the tooltip if editor section inside the popover is disabled', async () => {
			const node = populateNode();
			node.permissions.can_write_folder = false;
			node.permissions.can_write_file = false;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadAndShare;
			const mocks = {
				Mutation: {
					updateShares: vi.fn(mockUpdateShares(share) as unknown as (...args: unknown[]) => Share[])
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = vi.fn();
			const { user } = setup(
				<ShareListItem
					deleteShares={deleteShare}
					share={share}
					permissions={node.permissions}
					yourself={false}
				/>,
				{
					mocks
				}
			);

			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			await user.hover(screen.getByText(/editor/i));
			expect(
				await screen.findByText(/You don't have the necessary permissions to assign editor rights/i)
			).toBeVisible();
		});
	});
});
