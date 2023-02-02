/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { Container } from '@zextras/carbonio-design-system';

import { useActiveNode } from '../../../hooks/useActiveNode';
import { useGetNodeQuery } from '../../hooks/graphql/queries/useGetNodeQuery';
import { DisplayerNode } from './DisplayerNode';
import { EmptyDisplayer } from './EmptyDisplayer';

export interface DisplayerProps {
	translationKey: string;
	icons?: string[];
}

export const Displayer: React.VFC<DisplayerProps> = ({ translationKey, icons = [] }) => {
	const { activeNodeId } = useActiveNode();
	const {
		data: nodeData,
		loading,
		loadMore,
		hasMore
	} = useGetNodeQuery(activeNodeId, undefined, { returnPartialData: true });

	const node = useMemo(() => nodeData?.getNode || null, [nodeData]);

	return (
		<Container
			orientation="vertical"
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			data-testid="displayer"
		>
			{node ? (
				<DisplayerNode node={node} loading={loading} loadMore={loadMore} hasMore={hasMore} />
			) : (
				<EmptyDisplayer icons={icons} translationKey={translationKey} />
			)}
		</Container>
	);
};
