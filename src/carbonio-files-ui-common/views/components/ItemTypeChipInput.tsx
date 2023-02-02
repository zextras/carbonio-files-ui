/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import { ChipInput, ChipInputProps, ChipItem } from '@zextras/carbonio-design-system';
import { isEmpty, reduce } from 'lodash';
import { useTranslation } from 'react-i18next';

import { AdvancedFilters } from '../../types/common';
import { NodeType } from '../../types/graphql/types';

interface ItemTypeChipInputProps {
	currentFilters: AdvancedFilters;
	updateFilter: (
		key: keyof AdvancedFilters,
		value: AdvancedFilters[typeof key] | undefined
	) => void;
}

const itemTypesArray = [
	{
		id: 'Folder',
		value: NodeType.Folder,
		icon: 'Folder'
	},
	{
		id: 'Document',
		value: NodeType.Text,
		icon: 'FileText'
	},
	{
		id: 'Spreadsheet',
		value: NodeType.Spreadsheet,
		icon: 'FileCalc'
	},
	{
		id: 'Presentation',
		value: NodeType.Presentation,
		icon: 'FilePresentation'
	},
	{
		id: 'Image',
		value: NodeType.Image,
		icon: 'Image'
	},
	{
		id: 'Video',
		value: NodeType.Video,
		icon: 'Video'
	},
	{
		id: 'Audio',
		value: NodeType.Audio,
		icon: 'Music'
	}
];

export const ItemTypeChipInput: React.VFC<ItemTypeChipInputProps> = ({
	currentFilters,
	updateFilter
}) => {
	const [t] = useTranslation();
	const [filterValue, setFilterValue] = useState<string | null>(null);

	const itemTypeOnType = useCallback<NonNullable<ChipInputProps['onInputType']>>((ev) => {
		if (ev.key.length === 1 || ev.key === 'Delete' || ev.key === 'Backspace') {
			setFilterValue(ev.textContent);
		}
	}, []);

	const itemTypeOnChange = useCallback<NonNullable<ChipInputProps['onChange']>>(
		(newItemType) => {
			setFilterValue(null);
			if (!isEmpty(newItemType)) {
				updateFilter('type', {
					label: newItemType[0].label,
					avatarBackground: 'secondary',
					avatarIcon: newItemType[0].avatarIcon,
					onClick: (event) => {
						event.stopPropagation();
					},
					value: (newItemType[0].value as string) || undefined
				});
			} else {
				updateFilter('type', undefined);
			}
		},
		[updateFilter]
	);

	const itemTypeChipInputValue = useMemo<ChipItem[]>(() => {
		if (currentFilters.type) {
			return [{ ...currentFilters.type, background: 'gray2' }];
		}
		return [];
	}, [currentFilters.type]);

	const dropdownItems = useMemo(() => {
		if (itemTypeChipInputValue.length > 0) {
			return [];
		}
		return reduce<
			{ id: string; icon: string; value: NodeType },
			NonNullable<ChipInputProps['options']>
		>(
			itemTypesArray,
			(accumulator, item) => {
				if (filterValue === null || item.id.toLowerCase().includes(filterValue.toLowerCase())) {
					const mappedItem = {
						icon: `${item.icon}Outline`,
						label: t(
							`search.advancedSearch.modal.itemType.dropdownOption.${item.id.toLowerCase()}`,
							item.id
						),
						id: `$${item.id}`,
						avatarIcon: item.icon,
						value: item.value
					};

					accumulator.push({
						icon: mappedItem.icon,
						label: mappedItem.label,
						id: mappedItem.id,
						value: { ...mappedItem }
					});
				}
				return accumulator;
			},
			[]
		);
	}, [itemTypeChipInputValue.length, filterValue, t]);

	return (
		<ChipInput
			placeholder={t('search.advancedSearch.modal.itemType.label', 'Item type')}
			background="gray5"
			confirmChipOnSpace={false}
			confirmChipOnBlur={false}
			value={itemTypeChipInputValue}
			separators={['']}
			disableOptions={false}
			maxChips={1}
			onChange={itemTypeOnChange}
			onInputType={itemTypeOnType}
			options={dropdownItems}
			icon={'ChevronDown'}
			singleSelection
			requireUniqueChips
		/>
	);
};
