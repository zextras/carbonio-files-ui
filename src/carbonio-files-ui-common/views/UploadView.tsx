/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { filter } from 'lodash';

import { OverQuotaBanner } from './components/OverQuotaBanner';
import { SelectionProvider } from './components/SelectionProvider';
import { UploadDisplayer } from './components/UploadDisplayer';
import { UploadList } from './components/UploadList';
import { ViewLayout } from './ViewLayout';
import { uploadVar } from '../apollo/uploadVar';
import { ROOTS, VIEW_MODE } from '../constants';
import { ListContext } from '../contexts';
import { useUploadFileNewAction } from '../hooks/useUploadFileNewAction';

const UploadView = (): React.JSX.Element => {
	useUploadFileNewAction(true, ROOTS.LOCAL_ROOT);

	const listContextValue = useMemo<Partial<React.ContextType<typeof ListContext>>>(
		() => ({
			viewMode: VIEW_MODE.list
		}),
		[]
	);

	const uploadVarData = useReactiveVar(uploadVar);

	const uploadItems = useMemo(
		() => filter(uploadVarData, (upload) => upload.parentId === null),
		[uploadVarData]
	);

	const ListComponent = useMemo(
		() => (
			<SelectionProvider items={uploadItems}>
				<UploadList uploadItems={uploadItems} />
			</SelectionProvider>
		),
		[uploadItems]
	);

	return (
		<>
			<OverQuotaBanner />
			<ViewLayout
				listComponent={ListComponent}
				displayerComponent={<UploadDisplayer />}
				listContextValue={listContextValue}
			/>
		</>
	);
};

export default UploadView;
