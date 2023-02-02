/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useModal } from '@zextras/carbonio-design-system';

import { useSearch } from '../../../hooks/useSearch';
import { searchParamsVar } from '../../apollo/searchVar';
import { AdvancedSearchModalContent } from '../../views/components/AdvancedSearchModalContent';

export function useAdvancedSearchModal(): {
	openAdvancedSearchModal: () => void;
} {
	const createModal = useModal();
	const { searchAdvancedFilters } = useSearch();

	const openAdvancedSearchModal = useCallback(() => {
		const closeModal = createModal(
			{
				minHeight: '16rem',
				maxHeight: '90vh',
				onClose: () => {
					closeModal();
				},
				children: (
					<AdvancedSearchModalContent
						closeAction={(): void => closeModal()}
						filters={searchParamsVar()}
						searchAdvancedFilters={searchAdvancedFilters}
					/>
				)
			},
			true
		);
	}, [createModal, searchAdvancedFilters]);

	return { openAdvancedSearchModal };
}
