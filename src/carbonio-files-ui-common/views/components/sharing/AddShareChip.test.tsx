/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { populateGalContact, populateNode } from '../../../mocks/mockUtils';
import { Role, ShareChip } from '../../../types/common';
import { GetNodeQuery, GetNodeQueryVariables } from '../../../types/graphql/types';
import { getNodeVariables, mockGetNode } from '../../../utils/mockUtils';
import { setup } from '../../../utils/testUtils';
import { getChipLabel } from '../../../utils/utils';
import { AddShareChip } from './AddShareChip';

describe('Add Share Chip', () => {
	test('render a chip for share with read-only permissions', async () => {
		const onUpdateFn = jest.fn();
		const onCloseFn = jest.fn();
		const contact = populateGalContact();
		const { user } = setup(
			<AddShareChip
				value={{
					id: 'chip',
					role: Role.Viewer,
					sharingAllowed: false,
					onUpdate: onUpdateFn,
					...contact
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		expect(screen.getByTestId('icon: Close')).toBeVisible();

		await user.click(screen.getByTestId('icon: Close'));

		expect(onCloseFn).toHaveBeenCalled();
	});

	test('render a chip for share with read and write permissions', async () => {
		const onUpdateFn = jest.fn();
		const onCloseFn = jest.fn();
		const contact = populateGalContact();
		const { user } = setup(
			<AddShareChip
				value={{
					id: 'chip',
					role: Role.Editor,
					sharingAllowed: false,
					onUpdate: onUpdateFn,
					...contact
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.queryByTestId('icon: EyeOutline')).not.toBeInTheDocument();
		expect(screen.getByTestId('icon: Edit2Outline')).toBeVisible();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		expect(screen.getByTestId('icon: Close')).toBeVisible();

		await user.click(screen.getByTestId('icon: Close'));

		expect(onCloseFn).toHaveBeenCalled();
	});

	test('render a chip for share with read and share permissions', async () => {
		const onUpdateFn = jest.fn();
		const onCloseFn = jest.fn();
		const contact = populateGalContact();
		const { user } = setup(
			<AddShareChip
				value={{
					id: 'chip',
					role: Role.Viewer,
					sharingAllowed: true,
					onUpdate: onUpdateFn,
					...contact
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.getByTestId('icon: Share')).toBeVisible();
		expect(screen.getByTestId('icon: Close')).toBeVisible();

		await user.click(screen.getByTestId('icon: Close'));

		expect(onCloseFn).toHaveBeenCalled();
	});

	test('render a chip for share with write and share permissions', async () => {
		const onUpdateFn = jest.fn();
		const onCloseFn = jest.fn();
		const contact = populateGalContact();
		const { user } = setup(
			<AddShareChip
				value={{
					id: 'chip',
					role: Role.Editor,
					sharingAllowed: true,
					onUpdate: onUpdateFn,
					...contact
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.queryByTestId('icon: EyeOutline')).not.toBeInTheDocument();
		expect(screen.getByTestId('icon: Edit2Outline')).toBeVisible();
		expect(screen.getByTestId('icon: Share')).toBeVisible();
		expect(screen.getByTestId('icon: Close')).toBeVisible();

		await user.click(screen.getByTestId('icon: Close'));

		expect(onCloseFn).toHaveBeenCalled();
	});

	test('click on the chip open popover which contains roles and description of roles', async () => {
		const onUpdateFn = jest.fn();
		const onCloseFn = jest.fn();
		const contact = populateGalContact();
		const { user } = setup(
			<AddShareChip
				value={{
					id: 'chip',
					role: Role.Viewer,
					sharingAllowed: false,
					onUpdate: onUpdateFn,
					...contact
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();

		await user.click(screen.getByTestId('icon: EyeOutline'));

		expect(screen.getByText('Viewer')).toBeVisible();
		expect(screen.getByText('It will only be able to view or download the file or folder'));
		expect(screen.getByText('Editor')).toBeVisible();
		expect(screen.getByText('It will be able to view and edit the file or folder'));
		expect(screen.getByText('Sharing allowed')).toBeVisible();
		expect(screen.getByText('It will be able to manage shares of the file or folder'));
	});

	describe('Within popover', () => {
		test('click on other role trigger update of the chip. Popover remains open', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const onUpdateFn = jest.fn();
			const onCloseFn = jest.fn();
			const contact = populateGalContact();

			const mockedGetNodeQuery = mockGetNode(getNodeVariables(node.id), node);

			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				...mockedGetNodeQuery.request,
				data: {
					getNode: node
				}
			});

			const chip: ShareChip['value'] = {
				id: 'chip-id',
				role: Role.Viewer,
				sharingAllowed: false,
				onUpdate: onUpdateFn,
				...contact
			};

			const { user } = setup(<AddShareChip value={chip} onClose={onCloseFn} />, {
				initialRouterEntries: [`/?node=${node.id}`]
			});

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId('icon: EyeOutline'));

			expect(screen.getByText('Editor')).toBeVisible();
			await user.click(screen.getByText('Editor'));
			expect(onUpdateFn).toHaveBeenCalled();
			expect(onUpdateFn).toHaveBeenCalledWith(chip.id, { role: Role.Editor });
			expect(screen.getByText('Viewer')).toBeVisible();
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByText('Sharing allowed')).toBeVisible();
		});

		test('editor entry is disabled if user has not write permissions. Popover remains open', async () => {
			const node = populateNode();
			node.permissions.can_write_file = false;
			node.permissions.can_write_folder = false;
			const onUpdateFn = jest.fn();
			const onCloseFn = jest.fn();
			const contact = populateGalContact();

			const mockedGetNodeQuery = mockGetNode(getNodeVariables(node.id), node);

			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				...mockedGetNodeQuery.request,
				data: {
					getNode: node
				}
			});

			const { user } = setup(
				<AddShareChip
					value={{
						id: 'chip',
						role: Role.Viewer,
						sharingAllowed: false,
						onUpdate: onUpdateFn,
						...contact
					}}
					onClose={onCloseFn}
				/>,
				{ initialRouterEntries: [`/?node=${node.id}`] }
			);

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId('icon: EyeOutline'));

			expect(screen.getByTestId('exclusive-selection-editor')).toBeInTheDocument();
			expect(screen.getByText('Editor')).toBeVisible();
			await user.click(screen.getByText('Editor'));
			expect(onUpdateFn).not.toHaveBeenCalled();
			expect(screen.getByText('Viewer')).toBeVisible();
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByText('Sharing allowed')).toBeVisible();
		});

		test('click on unchecked checkbox "Sharing allowed" trigger update of the chip. Popover remains open', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const onUpdateFn = jest.fn();
			const onCloseFn = jest.fn();
			const contact = populateGalContact();

			const mockedGetNodeQuery = mockGetNode(getNodeVariables(node.id), node);

			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				...mockedGetNodeQuery.request,
				data: {
					getNode: node
				}
			});

			const chip: ShareChip['value'] = {
				id: 'chip-id',
				role: Role.Viewer,
				sharingAllowed: false,
				onUpdate: onUpdateFn,
				...contact
			};

			const { user } = setup(<AddShareChip value={chip} onClose={onCloseFn} />, {
				initialRouterEntries: [`/?node=${node.id}`]
			});

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId('icon: EyeOutline'));

			expect(screen.getByText('Sharing allowed')).toBeVisible();
			expect(screen.getByTestId('icon: Square')).toBeVisible();
			expect(screen.queryByTestId('icon: CheckmarkSquare')).not.toBeInTheDocument();
			// only click on checkbox trigger update
			await user.click(screen.getByText('Sharing allowed'));
			expect(onUpdateFn).not.toHaveBeenCalled();
			await user.click(screen.getByTestId('icon: Square'));
			expect(onUpdateFn).toHaveBeenCalled();
			expect(onUpdateFn).toHaveBeenCalledWith(chip.id, { sharingAllowed: true });
			expect(screen.getByText('Viewer')).toBeVisible();
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByText('Sharing allowed')).toBeVisible();
		});

		test('click on checked checkbox "Sharing allowed" trigger update of the chip. Popover remains open', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const onUpdateFn = jest.fn();
			const onCloseFn = jest.fn();
			const contact = populateGalContact();

			const mockedGetNodeQuery = mockGetNode(getNodeVariables(node.id), node);

			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				...mockedGetNodeQuery.request,
				data: {
					getNode: node
				}
			});

			const chip: ShareChip['value'] = {
				id: 'chip-id',
				role: Role.Viewer,
				sharingAllowed: true,
				onUpdate: onUpdateFn,
				...contact
			};

			const { user } = setup(<AddShareChip value={chip} onClose={onCloseFn} />, {
				initialRouterEntries: [`/?node=${node.id}`]
			});

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId('icon: EyeOutline'));

			expect(screen.getByText('Sharing allowed')).toBeVisible();
			expect(screen.getByTestId('icon: CheckmarkSquare')).toBeVisible();
			expect(screen.queryByTestId('icon: Square')).not.toBeInTheDocument();
			await user.click(screen.getByTestId('icon: CheckmarkSquare'));
			expect(onUpdateFn).toHaveBeenCalled();
			expect(onUpdateFn).toHaveBeenCalledWith(chip.id, { sharingAllowed: false });
			expect(screen.getByText('Viewer')).toBeVisible();
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByText('Sharing allowed')).toBeVisible();
		});
	});
});
