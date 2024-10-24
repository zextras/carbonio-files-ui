/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { AddShareChip } from './AddShareChip';
import { ICON_REGEXP, SELECTORS } from '../../../constants/test';
import { populateGalContact, populateNode } from '../../../mocks/mockUtils';
import { setup } from '../../../tests/utils';
import { Role, ShareChip } from '../../../types/common';
import { getChipLabel } from '../../../utils/utils';

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
					...contact,
					node: populateNode()
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.shareCanWrite)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.shareCanShare)).not.toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();

		await user.click(screen.getByTestId(ICON_REGEXP.close));

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
					...contact,
					node: populateNode()
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.shareCanRead)).not.toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.shareCanShare)).not.toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();

		await user.click(screen.getByTestId(ICON_REGEXP.close));

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
					...contact,
					node: populateNode()
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.shareCanWrite)).not.toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();

		await user.click(screen.getByTestId(ICON_REGEXP.close));

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
					...contact,
					node: populateNode()
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.shareCanRead)).not.toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();

		await user.click(screen.getByTestId(ICON_REGEXP.close));

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
					...contact,
					node: populateNode()
				}}
				onClose={onCloseFn}
			/>
		);

		expect(screen.getByText(getChipLabel(contact))).toBeVisible();

		await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));

		expect(screen.getByText('Viewer')).toBeVisible();
		expect(screen.getByText('It will only be able to view or download the item')).toBeVisible();
		expect(screen.getByText('Editor')).toBeVisible();
		expect(screen.getByText('It will be able to view and edit the item')).toBeVisible();
		expect(screen.getByText('Sharing allowed')).toBeVisible();
		expect(screen.getByText('It will be able to manage shares of the item')).toBeVisible();
	});

	describe('Within popover', () => {
		test('click on other role trigger update of the chip. Popover remains open', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const onUpdateFn = jest.fn();
			const onCloseFn = jest.fn();
			const contact = populateGalContact();

			const chip: ShareChip['value'] = {
				id: 'chip-id',
				role: Role.Viewer,
				sharingAllowed: false,
				onUpdate: onUpdateFn,
				...contact,
				node
			};

			const { user } = setup(<AddShareChip value={chip} onClose={onCloseFn} />, {
				initialRouterEntries: [`/?node=${node.id}`]
			});

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));

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

			const { user } = setup(
				<AddShareChip
					value={{
						id: 'chip',
						role: Role.Viewer,
						sharingAllowed: false,
						onUpdate: onUpdateFn,
						...contact,
						node
					}}
					onClose={onCloseFn}
				/>,
				{ initialRouterEntries: [`/?node=${node.id}`] }
			);

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));

			expect(screen.getByTestId(SELECTORS.exclusiveSelectionEditor)).toBeInTheDocument();
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

			const chip: ShareChip['value'] = {
				id: 'chip-id',
				role: Role.Viewer,
				sharingAllowed: false,
				onUpdate: onUpdateFn,
				...contact,
				node
			};

			const { user } = setup(<AddShareChip value={chip} onClose={onCloseFn} />, {
				initialRouterEntries: [`/?node=${node.id}`]
			});

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));

			expect(screen.getByText('Sharing allowed')).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.checkboxUnchecked)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.checkboxChecked)).not.toBeInTheDocument();
			// only click on checkbox trigger update
			await user.click(screen.getByText('Sharing allowed'));
			expect(onUpdateFn).not.toHaveBeenCalled();
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
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

			const chip: ShareChip['value'] = {
				id: 'chip-id',
				role: Role.Viewer,
				sharingAllowed: true,
				onUpdate: onUpdateFn,
				...contact,
				node
			};

			const { user } = setup(<AddShareChip value={chip} onClose={onCloseFn} />, {
				initialRouterEntries: [`/?node=${node.id}`]
			});

			expect(screen.getByText(getChipLabel(contact))).toBeVisible();

			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));

			expect(screen.getByText('Sharing allowed')).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.checkboxChecked)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.checkboxUnchecked)).not.toBeInTheDocument();
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxChecked));
			expect(onUpdateFn).toHaveBeenCalled();
			expect(onUpdateFn).toHaveBeenCalledWith(chip.id, { sharingAllowed: false });
			expect(screen.getByText('Viewer')).toBeVisible();
			expect(screen.getByText('Editor')).toBeVisible();
			expect(screen.getByText('Sharing allowed')).toBeVisible();
		});

		it('should not show save button', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const onUpdateFn = jest.fn();
			const onCloseFn = jest.fn();
			const contact = populateGalContact();

			const chip: ShareChip['value'] = {
				id: 'chip-id',
				role: Role.Viewer,
				sharingAllowed: true,
				onUpdate: onUpdateFn,
				...contact,
				node
			};

			const { user } = setup(<AddShareChip value={chip} onClose={onCloseFn} />, {
				initialRouterEntries: [`/?node=${node.id}`]
			});

			await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
			await screen.findByTestId(SELECTORS.popper);
			expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
		});
	});
});
