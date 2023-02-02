/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useRef } from 'react';

import { FetchResult } from '@apollo/client';
import { useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { CreateDocsFile } from '../../types/common';
import { CreateFolderMutation } from '../../types/graphql/types';
import { UpdateNodeNameModalContent } from '../../views/components/UpdateNodeNameModalContent';

export function useCreateModal(
	title: string,
	inputLabel: string,
	createAction: (
		parentId: string,
		newName: string
	) => Promise<FetchResult<CreateFolderMutation | CreateDocsFile>>,
	createActionCallback?: () => void
): {
	openCreateModal: (parentFolderId: string) => void;
} {
	const createModal = useModal();
	const [t] = useTranslation();
	const modalOpenRef = useRef(false);

	const confirmAction = useCallback(
		(parentId, newName) => {
			if (newName) {
				return createAction(parentId, newName);
			}
			return Promise.reject(new Error('name cannot be empty'));
		},
		[createAction]
	);

	const openCreateModal = useCallback(
		(parentFolderId: string) => {
			if (!modalOpenRef.current && parentFolderId) {
				const closeModal = createModal(
					{
						onClose: () => {
							createActionCallback && createActionCallback();
							closeModal();
							modalOpenRef.current = false;
						},
						children: (
							<UpdateNodeNameModalContent
								inputLabel={inputLabel}
								nodeName=""
								confirmAction={confirmAction}
								confirmLabel={t('folder.create.modal.button.confirm', 'Create')}
								nodeId={parentFolderId}
								closeAction={(): void => {
									createActionCallback && createActionCallback();
									closeModal();
									modalOpenRef.current = false;
								}}
								title={title}
							/>
						)
					},
					true
				);
				modalOpenRef.current = true;
			}
		},
		[confirmAction, createActionCallback, createModal, inputLabel, t, title]
	);

	return { openCreateModal };
}
