/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { Displayer } from './components/Displayer';
import FileList from './components/FileList';
import { ViewLayout } from './ViewLayout';
import { ROOTS, VIEW_MODE } from '../constants';
import { ListContext } from '../contexts';
import useQueryParam from '../hooks/useQueryParam';
import { useUploadFileNewAction } from '../hooks/useUploadFileNewAction';

const FileView = (): React.JSX.Element => {
	const fileId = useQueryParam('file');

	useUploadFileNewAction(false, ROOTS.LOCAL_ROOT);

	const listContextValue = useMemo<Partial<React.ContextType<typeof ListContext>>>(
		() => ({
			viewMode: VIEW_MODE.list
		}),
		[]
	);
	return (
		<ViewLayout
			listComponent={<FileList fileId={fileId ?? ''} canUploadFile={false} />}
			displayerComponent={<Displayer translationKey="displayer.generic" />}
			listContextValue={listContextValue}
		/>
	);
};

export default FileView;
