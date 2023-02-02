/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable jsx-a11y/no-autofocus */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { FetchResult } from '@apollo/client';
import {
	Divider,
	Input,
	ModalBody,
	ModalFooter,
	ModalHeader
} from '@zextras/carbonio-design-system';
import { trim } from 'lodash';
import { useTranslation } from 'react-i18next';

import { CreateDocsFile } from '../../types/common';
import { CreateFolderMutation, UpdateNodeMutation } from '../../types/graphql/types';
import { decodeError } from '../../utils/utils';
import { ModalFooterCustom } from './ModalFooterCustom';

type UpdateNameMutation = UpdateNodeMutation | CreateFolderMutation | CreateDocsFile;

interface UpdateNodeNameModalProps<T extends UpdateNameMutation> {
	nodeId: string;
	nodeName: string;
	inputLabel: string;
	confirmLabel: string;
	confirmAction: (nodeId: string, newName: string) => Promise<FetchResult<T>>;
	closeAction?: () => void;
	title: string;
}

export const UpdateNodeNameModalContent = <T extends UpdateNameMutation>({
	nodeId,
	nodeName,
	inputLabel,
	confirmLabel,
	confirmAction,
	closeAction,
	title
}: UpdateNodeNameModalProps<T>): JSX.Element => {
	const [t] = useTranslation();
	const [newName, setNewName] = useState(nodeName || '');
	const [errorMsg, setErrorMsg] = useState<string>();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			inputRef.current && inputRef.current.focus();
		}, 1);

		return (): void => {
			clearTimeout(timer);
		};
	}, []);

	const changeName = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
		({ target: { value } }) => {
			if (trim(value).length === 0) {
				setNewName('');
			} else {
				setNewName(value);
			}
		},
		[]
	);

	const [pendingRequest, setPendingRequest] = useState(false);

	const confirmHandler = useCallback(() => {
		if (!pendingRequest) {
			setPendingRequest(true);
			confirmAction(nodeId, trim(newName))
				.then(() => {
					setPendingRequest(false);
					closeAction && closeAction();
				})
				.catch((err) => {
					setPendingRequest(false);
					setErrorMsg(decodeError(err, t) || 'something went wrong');
				});
		}
	}, [closeAction, confirmAction, newName, nodeId, pendingRequest, t]);

	const keyUpHandler = useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
		(event) => {
			if (event.key === 'Enter') {
				confirmHandler();
			}
		},
		[confirmHandler]
	);

	return (
		<>
			<ModalHeader
				title={title}
				showCloseIcon
				onClose={closeAction}
				closeIconTooltip={t('modal.close.tooltip', 'Close')}
			/>
			<Divider />
			<ModalBody>
				<Input
					value={newName}
					onChange={changeName}
					label={inputLabel}
					data-testid="input-name"
					inputRef={inputRef}
					onKeyUp={keyUpHandler}
					hasError={!!errorMsg}
					description={errorMsg || undefined}
				/>
			</ModalBody>
			<Divider />
			<ModalFooter
				customFooter={
					<ModalFooterCustom
						confirmLabel={confirmLabel}
						confirmHandler={confirmHandler}
						confirmDisabled={!newName || newName === nodeName || pendingRequest}
					/>
				}
			/>
		</>
	);
};
