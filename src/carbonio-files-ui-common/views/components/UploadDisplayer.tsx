/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { useQuery, useReactiveVar } from '@apollo/client';
import { Container } from '@zextras/carbonio-design-system';
import { some } from 'lodash';

import { EmptyDisplayer } from './EmptyDisplayer';
import { handledErrors, UploadDisplayerNode } from './UploadDisplayerNode';
import { UploadFailureEmptyDisplayer } from './UploadFailureEmptyDisplayer';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { uploadVar } from '../../apollo/uploadVar';
import { GetUploadItemDocument } from '../../types/graphql/types';

export const UploadDisplayer = (): React.JSX.Element => {
	const { activeNodeId } = useActiveNode();
	const { data } = useQuery(GetUploadItemDocument, {
		variables: { id: activeNodeId || '' },
		skip: !activeNodeId
	});
	const uploadItem = useMemo(() => data?.getUploadItem, [data]);

	const uploadVarData = useReactiveVar(uploadVar);

	const showFailureDisplayer = useMemo(
		() =>
			some(
				uploadVarData,
				(upload) => upload.statusCode !== undefined && handledErrors.includes(upload.statusCode)
			),
		[uploadVarData]
	);

	return (
		<Container
			orientation="vertical"
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			data-testid="displayer"
		>
			{(uploadItem && <UploadDisplayerNode uploadItem={uploadItem} />) ||
				(showFailureDisplayer && <UploadFailureEmptyDisplayer />) || (
					<EmptyDisplayer
						icons={['ImageOutline', 'FileAddOutline', 'FilmOutline']}
						translationKey={'displayer.uploads'}
					/>
				)}
		</Container>
	);
};
