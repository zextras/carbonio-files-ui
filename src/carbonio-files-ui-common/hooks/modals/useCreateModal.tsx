/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useRef } from 'react';

import { FetchResult } from '@apollo/client';
import { InputProps, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { CreateDocsFile } from '../../types/common';
import { CreateFolderMutation } from '../../types/graphql/types';
import { UpdateNodeNameModalContent } from '../../views/components/UpdateNodeNameModalContent';

type CreateActionFn = (
	parentId: string,
	newName: string
) => Promise<FetchResult<CreateFolderMutation | CreateDocsFile>>;

type OpenCreateModalFn = (options: {
	title: string;
	inputLabel: string;
	createAction: CreateActionFn;
	inputCustomIcon?: InputProps['CustomIcon'];
	createActionCallback?: () => void;
	parentFolderId: string;
}) => void;

export function useCreateModal(): {
	openCreateModal: OpenCreateModalFn;
} {
	const { createModal, closeModal } = useModal();
	const [t] = useTranslation();
	const modalOpenRef = useRef(false);
	const modalId = 'files-create-modal';

	const openCreateModal = useCallback<OpenCreateModalFn>(
		({
			title,
			inputLabel,
			createAction,
			inputCustomIcon,
			createActionCallback,
			parentFolderId
		}) => {
			if (!modalOpenRef.current && parentFolderId) {
				const confirmAction: CreateActionFn = (parentId, newName) => {
					if (newName) {
						return createAction(parentId, newName);
					}
					return Promise.reject(new Error('name cannot be empty'));
				};
				const closeAction = (): void => {
					createActionCallback?.();
					closeModal(modalId);
					modalOpenRef.current = false;
				};
				createModal(
					{
						id: modalId,
						onClose: closeAction,
						children: (
							<UpdateNodeNameModalContent
								inputLabel={inputLabel}
								nodeName=""
								confirmAction={confirmAction}
								confirmLabel={t('folder.create.modal.button.confirm', 'Create')}
								nodeId={parentFolderId}
								closeAction={closeAction}
								title={title}
								inputCustomIcon={inputCustomIcon}
							/>
						)
					},
					true
				);
				modalOpenRef.current = true;
			}
		},
		[closeModal, createModal, t]
	);

	return { openCreateModal };
}
