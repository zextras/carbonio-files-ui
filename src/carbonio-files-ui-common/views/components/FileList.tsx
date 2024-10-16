/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { List } from './List';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { useGetNodeQuery } from '../../hooks/graphql/queries/useGetNodeQuery';

interface FileListProps {
	fileId: string;
	canUploadFile: boolean;
}

const FileList = ({ fileId, canUploadFile }: FileListProps): React.JSX.Element => {
	const [t] = useTranslation();
	const { data: nodeData, loading, loadMore, hasMore } = useGetNodeQuery(fileId);
	const node = useMemo(() => nodeData?.getNode ?? null, [nodeData]);

	const { setActiveNode, tab } = useActiveNode();

	useEffect(() => {
		setActiveNode(fileId, tab);
	}, [fileId, setActiveNode, tab]);

	const nodes = useMemo(() => {
		if (node) {
			return [node];
		}
		return [];
	}, [node]);

	return (
		<List
			nodes={nodes}
			hasMore={hasMore}
			loadMore={loadMore}
			loading={loading}
			canUpload={canUploadFile}
			emptyListMessage={t('empty.folder.hint', "It looks like there's nothing here.")}
			mainList={false}
		/>
	);
};

export default FileList;
