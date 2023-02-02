/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useState } from 'react';

import { useLazyQuery } from '@apollo/client';
import { Button, Row } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useNavigation } from '../../../hooks/useNavigation';
import { ROOTS } from '../../constants';
import GET_PATH from '../../graphql/queries/getPath.graphql';
import useQueryParam from '../../hooks/useQueryParam';
import { Crumb, Node, URLParams } from '../../types/common';
import { GetPathQuery, GetPathQueryVariables, NodeType } from '../../types/graphql/types';
import { buildCrumbs } from '../../utils/utils';
import { InteractiveBreadcrumbs } from '../InteractiveBreadcrumbs';
import { Label } from './Label';

export interface PathRowProps {
	id: Node['id'];
	name: Node['name'];
	type: Node['type'];
	rootId?: Node['rootId'];
}

export const PathRow = ({ id, name, type, rootId }: PathRowProps): JSX.Element => {
	const [t] = useTranslation();

	const activeFolderId = useQueryParam('folder');
	const { rootId: activeRootId } = useParams<URLParams>();

	const { navigateToFolder } = useNavigation();

	const isCrumbNavigable = useCallback(
		(node: Pick<Node, 'id' | 'type'>) =>
			(node.type === NodeType.Folder || node.type === NodeType.Root) &&
			// disable navigation for folder currently visible in list
			node.id !== activeFolderId &&
			node.id !== activeRootId &&
			// disable navigation if node is trashed
			rootId !== ROOTS.TRASH,
		[activeFolderId, activeRootId, rootId]
	);

	const [crumbs, setCrumbs] = useState<Crumb[]>(
		buildCrumbs(
			[{ name, id, type }],
			navigateToFolder,
			t,
			(node: Pick<Node, 'id' | 'name' | 'type'>) => isCrumbNavigable(node)
		)
	);

	const [crumbsRequested, setCrumbsRequested] = useState<boolean>(false);

	// use a lazy query to load full path only when requested
	const [getPathQuery, { data: getPathData }] = useLazyQuery<GetPathQuery, GetPathQueryVariables>(
		GET_PATH,
		{
			notifyOnNetworkStatusChange: true
		}
	);

	useEffect(() => {
		// when node changes, check if getPath is already in cache
		// if so, show full path
		// otherwise, show collapsed crumbs (by default show collapsed crumbs)
		setCrumbsRequested(false);
		setCrumbs(
			buildCrumbs(
				[{ name, id, type }],
				navigateToFolder,
				t,
				(node: Pick<Node, 'id' | 'name' | 'type'>) => isCrumbNavigable(node)
			)
		);
		getPathQuery({
			variables: {
				node_id: id
			},
			fetchPolicy: 'cache-only'
		});
	}, [getPathQuery, id, isCrumbNavigable, name, navigateToFolder, t, type]);

	useEffect(() => {
		// use an effect on data returned by lazy query to update the crumbs in order to trigger rerender of the UI
		// when lazy query reload following an eviction of the cache
		if (getPathData?.getPath) {
			setCrumbs(
				buildCrumbs(getPathData.getPath, navigateToFolder, t, (node: Pick<Node, 'id' | 'type'>) =>
					isCrumbNavigable(node)
				)
			);
			setCrumbsRequested(true);
		}
	}, [getPathData, isCrumbNavigable, navigateToFolder, t]);

	const loadPath = useCallback(() => {
		getPathQuery({
			variables: {
				node_id: id
			}
		});
	}, [getPathQuery, id]);

	return (
		<Row
			orientation="vertical"
			crossAlignment="flex-start"
			width="fill"
			padding={{ vertical: 'small' }}
		>
			<Label>{t('displayer.details.position', 'Position')}</Label>
			<Row width="fill" mainAlignment="flex-start">
				<Row minWidth="0">
					<InteractiveBreadcrumbs crumbs={crumbs} />
				</Row>
				{!crumbsRequested && (
					<Button
						label={t('displayer.details.showPath', 'Show path')}
						type="outlined"
						color="secondary"
						onClick={loadPath}
						shape="round"
					/>
				)}
			</Row>
		</Row>
	);
};
