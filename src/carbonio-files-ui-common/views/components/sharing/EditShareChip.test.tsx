/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { difference } from 'lodash';

import { EditShareChip } from './EditShareChip';
import { ICON_REGEXP, SELECTORS } from '../../../constants/test';
import { populateNode, populateShare, populateUser } from '../../../mocks/mockUtils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import { Permissions, Share, SharePermission } from '../../../types/graphql/types';
import { mockDeleteShare, mockUpdateShare } from '../../../utils/resolverMocks';
import { setup } from '../../../utils/testUtils';

describe('Edit Share Chip', () => {
	const allIcons = [
		ICON_REGEXP.shareCanRead,
		ICON_REGEXP.shareCanWrite,
		ICON_REGEXP.shareCanShare,
		ICON_REGEXP.close
	];
	describe.each<[string, Partial<Permissions>, typeof allIcons]>([
		[
			'read only',
			{
				can_write_folder: false,
				can_write_file: false,
				can_share: false
			},
			[]
		],
		[
			'read and write',
			{
				can_write_folder: true,
				can_write_file: true,
				can_share: false
			},
			[]
		],
		[
			'read and share',
			{
				can_write_folder: false,
				can_write_file: false,
				can_share: true
			},
			[ICON_REGEXP.close]
		],
		[
			'read write and share',
			{
				can_write_folder: true,
				can_write_file: true,
				can_share: true
			},
			[ICON_REGEXP.close]
		]
	])('From a node with %s permissions', (_, permissions, expectedIconsFromNodePermissions) => {
		test.each<[SharePermission, typeof allIcons]>([
			[SharePermission.ReadOnly, [ICON_REGEXP.shareCanRead]],
			[SharePermission.ReadAndWrite, [ICON_REGEXP.shareCanWrite]],
			[SharePermission.ReadAndShare, [ICON_REGEXP.shareCanRead, ICON_REGEXP.shareCanShare]],
			[SharePermission.ReadWriteAndShare, [ICON_REGEXP.shareCanWrite, ICON_REGEXP.shareCanShare]]
		])('render a chip of a %s share', (sharePermission, expectedIconsFromSharePermissions) => {
			const node = populateNode();
			node.permissions = { ...node.permissions, ...permissions };
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = sharePermission;
			const deleteShare = jest.fn();
			const renderedIcons = [
				...expectedIconsFromNodePermissions,
				...expectedIconsFromSharePermissions
			];
			const notRenderedIcons = difference(allIcons, renderedIcons);
			setup(
				<EditShareChip
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
					deleteShare={deleteShare}
				/>
			);
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			renderedIcons.forEach((icon) => {
				expect(screen.getByTestId(icon)).toBeVisible();
			});
			notRenderedIcons.forEach((icon) => {
				expect(screen.queryByTestId(icon)).not.toBeInTheDocument();
			});
		});
	});

	describe.each<[string, Partial<Permissions>]>([
		[
			'read only',
			{
				can_write_folder: false,
				can_write_file: false,
				can_share: false
			}
		],
		[
			'read and write',
			{
				can_write_folder: true,
				can_write_file: true,
				can_share: false
			}
		]
	])('From a node with %s permissions', () => {
		test('click on chip does not open popover', async () => {
			const node = populateNode();
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_share = false;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const deleteShare = jest.fn();
			const { user } = setup(
				<EditShareChip
					deleteShare={deleteShare}
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
				/>
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByText(userAccount.full_name));
			expect(screen.queryByText('Viewer')).not.toBeInTheDocument();
			expect(screen.queryByText('Editor')).not.toBeInTheDocument();
			expect(screen.queryByText('Sharing allowed')).not.toBeInTheDocument();
		});
	});

	describe('From a node with read and share permissions', () => {
		test('click on chip open popover with Editor item disabled', async () => {
			const node = populateNode();
			node.permissions.can_write_folder = false;
			node.permissions.can_write_file = false;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const deleteShare = jest.fn();
			const { user } = setup(
				<EditShareChip
					deleteShare={deleteShare}
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
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
		test('click on chip open popover with all items enabled', async () => {
			const node = populateNode();
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const deleteShare = jest.fn();
			const { user } = setup(
				<EditShareChip
					deleteShare={deleteShare}
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
				/>
			);

			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			expect(screen.getByText('Viewer')).toBeVisible();
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByText('Sharing allowed')).toBeVisible();

			expect(screen.getByRole('button', { name: /save/i })).toBeVisible();

			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(screen.getByTestId(SELECTORS.exclusiveSelectionViewer)).not.toHaveAttribute(
				'disabled'
			);
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(screen.getByTestId(SELECTORS.exclusiveSelectionEditor)).not.toHaveAttribute(
				'disabled'
			);
		});
	});

	test('render a chip of the logged user share. Click on close action open confirmation modal and then delete share', async () => {
		const node = populateNode();
		const userAccount = populateUser(mockedUserLogged.id, mockedUserLogged.name);
		const share = populateShare(node, 'abc', userAccount);
		const mocks = {
			Mutation: {
				deleteShare: mockDeleteShare(true)
			}
		} satisfies Partial<Resolvers>;
		const deleteShare = jest.fn(() => Promise.resolve({ data: { deleteShare: true } }));
		const { user } = setup(
			<EditShareChip
				deleteShare={deleteShare}
				share={share}
				permissions={node.permissions}
				yourselfChip
			/>,
			{
				mocks
			}
		);

		expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		expect(screen.getByText(/you/i)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();
		await user.click(screen.getByTestId(ICON_REGEXP.close));
		await screen.findByRole('button', { name: /remove/i });
		// run timers of modal
		act(() => {
			jest.advanceTimersToNextTimer();
		});
		expect(
			screen.getByText(/Are you sure to remove yourself from this collaboration/i)
		).toBeInTheDocument();
		expect(
			screen.getByText(/All the access permission previously given to you will be lost/i)
		).toBeInTheDocument();
		const regexp = RegExp(
			`Are you sure to remove all the access permission previously given to ${userAccount.full_name}?`,
			'i'
		);
		expect(screen.queryByText(regexp)).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /remove/i }));
		expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
		expect(deleteShare).toBeCalled();
	});

	test('click on close action open confirmation dialog and then delete share', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		const share = populateShare(node, 'abc', userAccount);
		share.permission = SharePermission.ReadAndShare;
		const mocks = {
			Mutation: {
				deleteShare: mockDeleteShare(true)
			}
		} satisfies Partial<Resolvers>;
		const deleteShare = jest.fn(() => Promise.resolve({ data: { deleteShare: true } }));
		const { getByTextWithMarkup, user } = setup(
			<EditShareChip
				deleteShare={deleteShare}
				share={share}
				permissions={node.permissions}
				yourselfChip={false}
			/>,
			{
				mocks
			}
		);

		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();
		await user.click(screen.getByTestId(ICON_REGEXP.close));
		await screen.findByRole('button', { name: /remove/i });
		// run timers of modal
		act(() => {
			jest.advanceTimersToNextTimer();
		});
		expect(
			screen.queryByText(/Are you sure to remove yourself from this collaboration/i)
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/All the access permission previously given to you will be lost/i)
		).not.toBeInTheDocument();
		const regexp = RegExp(
			`Are you sure to remove all the access permission previously given to\\s*${userAccount.full_name}\\s*?`,
			'i'
		);
		expect(getByTextWithMarkup(regexp)).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /remove/i }));
		expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
		expect(deleteShare).toBeCalled();
	});

	describe('within popover', () => {
		test('click on other enable save button but does not trigger chip update', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;

			const mocks = {
				Mutation: {
					updateShare: jest.fn(mockUpdateShare(share) as (...args: unknown[]) => Share)
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = jest.fn();
			const { user } = setup(
				<EditShareChip
					deleteShare={deleteShare}
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
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
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(screen.getByTestId(SELECTORS.exclusiveSelectionViewer)).not.toHaveAttribute(
				'disabled'
			);
			expect(screen.getByText(/editor/i)).toBeVisible();
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(screen.getByTestId(SELECTORS.exclusiveSelectionEditor)).not.toHaveAttribute(
				'disabled'
			);
			await user.click(screen.getByText(/editor/i));
			await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeEnabled());
			expect(mocks.Mutation.updateShare).not.toHaveBeenCalled();
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
					updateShare: jest.fn(mockUpdateShare(share) as (...args: unknown[]) => Share)
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = jest.fn();
			const { user } = setup(
				<EditShareChip
					deleteShare={deleteShare}
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
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
			expect(mocks.Mutation.updateShare).not.toHaveBeenCalled();
		});

		test('click on checkbox "sharing allowed" enable save button but does not trigger chip update', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const mocks = {
				Mutation: {
					updateShare: jest.fn(mockUpdateShare(share) as (...args: unknown[]) => Share)
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = jest.fn();
			const { user } = setup(
				<EditShareChip
					deleteShare={deleteShare}
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
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
			expect(mocks.Mutation.updateShare).not.toHaveBeenCalled();
			expect(screen.queryByTestId(ICON_REGEXP.checkboxUnchecked)).not.toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.checkboxChecked)).toBeVisible();
		});

		test('click on save trigger chip update. Popover is closed', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'abc', userAccount);
			share.permission = SharePermission.ReadOnly;
			const mocks = {
				Mutation: {
					updateShare: jest.fn(mockUpdateShare(share) as (...args: unknown[]) => Share)
				}
			} satisfies Partial<Resolvers>;
			const deleteShare = jest.fn();
			const { user } = setup(
				<EditShareChip
					deleteShare={deleteShare}
					share={share}
					permissions={node.permissions}
					yourselfChip={false}
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
			await waitFor(() => expect(mocks.Mutation.updateShare).toHaveBeenCalled());
			expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
			expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
		});
	});
});
