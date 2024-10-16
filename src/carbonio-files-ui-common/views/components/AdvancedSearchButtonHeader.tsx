/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { Button, Container, Divider } from '@zextras/carbonio-design-system';
import { isEmpty, filter, isArray } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useSearch } from '../../../hooks/useSearch';
import { useAdvancedSearchModal } from '../../hooks/modals/useAdvancedSearchModal';

export const AdvancedSearchButtonHeader = (): React.JSX.Element => {
	const [t] = useTranslation();
	const { searchParams } = useSearch();
	const { openAdvancedSearchModal } = useAdvancedSearchModal();
	const filterCount = useMemo(
		() =>
			filter(
				searchParams,
				(param) =>
					(isArray(param) && !isEmpty(param)) ||
					(!isArray(param) && !!param && 'label' in param && !!param.label)
			).length,
		[searchParams]
	);

	return (
		<>
			<Container orientation="horizontal" height="fit" padding={{ all: 'small' }}>
				<Button
					type={filterCount > 0 ? 'default' : 'outlined'}
					label={t('search.advancedSearch.button.filters', {
						count: filterCount,
						defaultValue_zero: 'Advanced filters',
						defaultValue_one: '{{count}} advanced filter',
						defaultValue_other: '{{count}} advanced filters'
					})}
					icon="Options2Outline"
					iconPlacement="right"
					width="fill"
					onClick={openAdvancedSearchModal}
				/>
			</Container>
			<Divider color="gray3" />
		</>
	);
};
