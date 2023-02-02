/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import { ChipInput, ChipInputProps, ChipItem } from '@zextras/carbonio-design-system';
import { isEmpty, filter, reduce, throttle } from 'lodash';
import { useTranslation } from 'react-i18next';

import { soapFetch } from '../../../network/network';
import { AdvancedFilters, Contact } from '../../types/common';
import { AutocompleteGalRequest, AutocompleteGalResponse, ContactInfo } from '../../types/network';
import { getChipLabel } from '../../utils/utils';
import { Hint, Loader } from './StyledComponents';

function contactInfoToContact(contactInfo: ContactInfo): Contact {
	return {
		email: contactInfo._attrs.email,
		firstName: contactInfo._attrs.firstName,
		lastName: contactInfo._attrs.lastName,
		fullName: contactInfo._attrs.fullName
	};
}

const removeGroups: (autocompleteGalResponse: AutocompleteGalResponse) => ContactInfo[] = ({
	cn
}) => filter(cn, (item) => !(item._attrs.type === 'group'));

interface OwnerChipInputProps {
	currentFilters: AdvancedFilters;
	updateFilter: (
		key: keyof AdvancedFilters,
		value: AdvancedFilters[typeof key] | undefined
	) => void;
}

export const OwnerChipInput: React.VFC<OwnerChipInputProps> = ({
	currentFilters,
	updateFilter
}) => {
	const [t] = useTranslation();

	const [loading, setLoading] = useState(false);

	const [searchResult, setSearchResult] = useState<Array<ContactInfo>>([]);

	const search = useMemo(
		() =>
			throttle(
				({ textContent }: React.KeyboardEvent & { textContent: string | null }) => {
					if (textContent === '' || textContent === null) {
						setSearchResult((prevSearchResult) =>
							prevSearchResult.length > 0 ? [] : prevSearchResult
						);
						return;
					}
					setLoading(true);
					soapFetch<AutocompleteGalRequest, AutocompleteGalResponse>(
						'AutoCompleteGal',
						{
							needExp: true,
							name: textContent
						},
						'urn:zimbraAccount'
					)
						.then(removeGroups)
						.then((cn) => {
							setLoading(false);
							setSearchResult(cn);
						})
						.catch((err: Error) => {
							console.error(err);
						});
				},
				500,
				{ leading: true }
			),
		[]
	);
	const ownerOnType = useCallback<NonNullable<ChipInputProps['onInputType']>>(
		(ev) => {
			if (ev.key.length === 1 || ev.key === 'Delete' || ev.key === 'Backspace') {
				search(ev);
			}
		},
		[search]
	);

	const dropdownItems = useMemo(() => {
		const items = reduce<ContactInfo, NonNullable<ChipInputProps['options']>>(
			searchResult,
			(accumulator, contactInfo) => {
				const label = getChipLabel(contactInfoToContact(contactInfo));
				accumulator.push({
					label,
					id: `$${contactInfo.id}`,
					customComponent: <Hint label={label} email={contactInfo._attrs.email} />,
					value: { ...contactInfo, label }
				});
				return accumulator;
			},
			[]
		);
		if (loading) {
			items.push({
				id: 'loading',
				label: 'loading',
				customComponent: <Loader />,
				value: undefined
			});
		}
		return items;
	}, [loading, searchResult]);

	const ownerOnChange = useCallback<NonNullable<ChipInputProps['onChange']>>(
		(newOwner) => {
			if (!isEmpty(newOwner)) {
				updateFilter('ownerId', {
					label: newOwner[0].label,
					avatarBackground: 'secondary',
					onClick: (event) => {
						event.stopPropagation();
					},
					value: (newOwner[0] as ContactInfo)._attrs.zimbraId || undefined
				});
			} else {
				updateFilter('ownerId', undefined);
			}
		},
		[updateFilter]
	);

	const ownerChipInputValue = useMemo<ChipItem[]>(() => {
		if (currentFilters.ownerId) {
			return [{ ...currentFilters.ownerId, background: 'gray2' }];
		}
		return [];
	}, [currentFilters.ownerId]);

	return (
		<ChipInput
			placeholder={t('search.advancedSearch.modal.owner.label', 'Owner')}
			background="gray5"
			maxChips={1}
			separators={['']}
			confirmChipOnSpace={false}
			confirmChipOnBlur={false}
			value={ownerChipInputValue}
			onChange={ownerOnChange}
			onInputType={ownerOnType}
			options={dropdownItems}
		/>
	);
};
