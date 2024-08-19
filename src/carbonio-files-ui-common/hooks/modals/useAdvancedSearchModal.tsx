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
	const { createModal, closeModal } = useModal();
	const { searchAdvancedFilters } = useSearch();

	const openAdvancedSearchModal = useCallback(() => {
		const modalId = 'files-advanced-search-modal';
		createModal(
			{
				id: modalId,
				minHeight: '16rem',
				maxHeight: '90vh',
				onClose: () => {
					closeModal(modalId);
				},
				children: (
					<AdvancedSearchModalContent
						closeAction={(): void => closeModal(modalId)}
						filters={searchParamsVar()}
						searchAdvancedFilters={searchAdvancedFilters}
					/>
				)
			},
			true
		);
	}, [closeModal, createModal, searchAdvancedFilters]);

	return { openAdvancedSearchModal };
}
