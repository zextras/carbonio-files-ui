/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { ChipInputProps, ChipItem } from '@zextras/carbonio-design-system';
import { isEmpty } from 'lodash';
import { useTranslation } from 'react-i18next';

import { AccountChipInput } from './AccountChipInput';
import { AdvancedFilters } from '../../types/common';
import { ContactInfo } from '../../types/network';

interface OwnerChipInputProps {
	currentFilters: AdvancedFilters;
	updateFilter: <K extends keyof AdvancedFilters>(
		key: K,
		value: AdvancedFilters[K] | undefined
	) => void;
	onInputType?: ChipInputProps['onInputType'];
}

export const OwnerChipInput = ({
	currentFilters,
	updateFilter,
	onInputType
}: OwnerChipInputProps): React.JSX.Element => {
	const [t] = useTranslation();

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
		<AccountChipInput
			placeholder={t('search.advancedSearch.modal.owner.label', 'Owner')}
			value={ownerChipInputValue}
			onChange={ownerOnChange}
			onInputType={onInputType}
			dropdownWidth={'fit-content'}
		/>
	);
};
