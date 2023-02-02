/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useRef } from 'react';

import { Button } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useUpload } from '../../../hooks/useUpload';
import { File } from '../../../types/graphql/types';
import { DeepPick } from '../../../types/utils';

export interface UploadVersionButtonProps {
	node: Pick<File, '__typename' | 'id'> & DeepPick<File, 'parent', 'id'>;
	disabled: boolean;
}

const UploadVersionButton: React.VFC<UploadVersionButtonProps> = ({ node, disabled }) => {
	const [t] = useTranslation();
	const { update } = useUpload();
	const inputRef = useRef<HTMLInputElement>(null);

	const inputElementOnchange = useCallback(
		(ev: Event) => {
			if (ev.currentTarget instanceof HTMLInputElement && ev.currentTarget.files) {
				update(node, ev.currentTarget.files[0]);
				// required to select 2 times the same file/files
				if (ev.target instanceof HTMLInputElement) {
					ev.target.value = '';
				}
			}
		},
		[node, update]
	);

	const uploadVersionHandler = useCallback(
		(event) => {
			event && event.stopPropagation();
			if (inputRef.current) {
				inputRef.current.click();
				inputRef.current.onchange = inputElementOnchange;
			}
		},
		[inputElementOnchange]
	);

	return (
		<>
			<Button
				label={t('displayer.version.button.upload', 'Upload version')}
				onClick={uploadVersionHandler}
				disabled={disabled}
			/>
			<input ref={inputRef} type={'file'} multiple={false} hidden alt={'Hidden file input'} />
		</>
	);
};

export default UploadVersionButton;
