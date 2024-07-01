/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';

import { OwnerChipInput } from './OwnerChipInput';
import * as network from '../../../network/network';
import { SELECTORS } from '../../constants/test';
import { populateAutocompleteGalResult } from '../../mocks/mockUtils';
import { screen, setup, within } from '../../tests/utils';
import { AdvancedFilters } from '../../types/common';
import { AutocompleteGalResponse, ContactInfo } from '../../types/network';
import { getChipLabel } from '../../utils/utils';

describe('OwnerChipInput', () => {
	it('should show email and contact label as suggestion', async () => {
		const match: ContactInfo[] = [populateAutocompleteGalResult()];
		jest.spyOn(network, 'soapFetch').mockImplementation(
			(): Promise<AutocompleteGalResponse> =>
				Promise.resolve({
					cn: match
				})
		);
		const updateFilter = jest.fn();
		const { user } = setup(<OwnerChipInput currentFilters={{}} updateFilter={updateFilter} />);
		await user.type(screen.getByRole('textbox', { name: 'Owner' }), 'a');
		expect(await screen.findByText(getChipLabel(match[0]._attrs))).toBeVisible();
		expect(screen.getByText(match[0]._attrs.email)).toBeVisible();
	});

	it('should show all results that are not groups as suggestions', async () => {
		const match: ContactInfo[] = [
			populateAutocompleteGalResult(),
			populateAutocompleteGalResult({ type: 'group' })
		];
		jest.spyOn(network, 'soapFetch').mockImplementation(
			(): Promise<AutocompleteGalResponse> =>
				Promise.resolve({
					cn: match
				})
		);
		const updateFilter = jest.fn();
		const { user } = setup(<OwnerChipInput currentFilters={{}} updateFilter={updateFilter} />);
		await user.type(screen.getByRole('textbox', { name: 'Owner' }), 'a');
		expect(await screen.findByText(getChipLabel(match[0]._attrs))).toBeVisible();
		expect(screen.queryByText(getChipLabel(match[1]._attrs))).not.toBeInTheDocument();
	});

	it('should show current filter as value if set', () => {
		const updateFilter = jest.fn();
		const currentOwner = {
			label: faker.person.fullName(),
			value: faker.string.uuid()
		} satisfies AdvancedFilters['ownerId'];
		setup(
			<OwnerChipInput currentFilters={{ ownerId: currentOwner }} updateFilter={updateFilter} />
		);
		expect(within(screen.getByTestId(SELECTORS.chip)).getByText(currentOwner.label)).toBeVisible();
	});

	it('should hide suggestions if user clears the input', async () => {
		const match: ContactInfo[] = [populateAutocompleteGalResult()];
		jest.spyOn(network, 'soapFetch').mockImplementation(
			(): Promise<AutocompleteGalResponse> =>
				Promise.resolve({
					cn: match
				})
		);
		const updateFilter = jest.fn();
		const { user } = setup(<OwnerChipInput currentFilters={{}} updateFilter={updateFilter} />);
		await user.type(screen.getByRole('textbox', { name: 'Owner' }), 'a');
		await screen.findByText(getChipLabel(match[0]._attrs));
		await user.type(screen.getByRole('textbox', { name: 'Owner' }), '{Backspace}');
		expect(screen.queryByText(getChipLabel(match[0]._attrs))).not.toBeInTheDocument();
	});

	it('should invoke updateFilter with the selected value', async () => {
		const match: ContactInfo[] = [populateAutocompleteGalResult()];
		jest.spyOn(network, 'soapFetch').mockImplementation(
			(): Promise<AutocompleteGalResponse> =>
				Promise.resolve({
					cn: match
				})
		);
		const updateFilter = jest.fn();
		const { user } = setup(<OwnerChipInput currentFilters={{}} updateFilter={updateFilter} />);
		await user.type(screen.getByRole('textbox', { name: 'Owner' }), 'a');
		const suggestion = await screen.findByText(getChipLabel(match[0]._attrs));
		await user.click(suggestion);
		expect(updateFilter).toHaveBeenCalledWith('ownerId', {
			label: getChipLabel(match[0]._attrs),
			avatarBackground: 'secondary',
			onClick: expect.any(Function),
			value: match[0]._attrs.zimbraId
		});
	});
});
