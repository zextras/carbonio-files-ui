/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo } from 'react';

import { Container, Divider, TabBar, TabBarProps } from '@zextras/carbonio-design-system';
import { map, filter } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useActiveNode } from '../../../hooks/useActiveNode';
import { DISPLAYER_TABS, ROOTS } from '../../constants';
import { GetNodeQuery } from '../../types/graphql/types';
import { canUpsertDescription } from '../../utils/ActionsFactory';
import { isFile, isFolder } from '../../utils/utils';
import { DisplayerActions } from './DisplayerActions';
import { DisplayerHeader } from './DisplayerHeader';
import { NodeDetails } from './NodeDetails';
import { NodeSharing } from './sharing/NodeSharing';
import { DisplayerContentContainer } from './StyledComponents';
import { Versioning } from './versioning/Versioning';

interface DisplayerNodeProps {
	node: NonNullable<GetNodeQuery['getNode']>;
	loading: boolean;
	loadMore: () => void;
	hasMore: boolean;
}

export const DisplayerNode: React.VFC<DisplayerNodeProps> = ({
	node,
	loading,
	loadMore,
	hasMore
}) => {
	const [t] = useTranslation();
	const {
		setActiveNode,
		removeActiveNode,
		tab,
		isDetailsTab,
		isSharingTab,
		isVersioningTab,
		isExistingTab
	} = useActiveNode();

	const activeNodeIsFile: boolean | null = useMemo(() => {
		if (node) {
			return isFile(node);
		}
		return null;
	}, [node]);

	const tabs = useMemo(
		() =>
			map(
				filter(
					DISPLAYER_TABS,
					(displayerTab) =>
						displayerTab !== DISPLAYER_TABS.versioning ||
						(activeNodeIsFile != null && activeNodeIsFile)
				),
				/* i18next-extract-disable-next-line */
				(dTab) => ({ id: dTab, label: t(`displayer.tabs.${dTab}`, dTab) })
			),
		[t, activeNodeIsFile]
	);

	const tabOnChangeHandler = useCallback<TabBarProps['onChange']>(
		(event, selectedId) => {
			setActiveNode(node.id, selectedId);
		},
		[node.id, setActiveNode]
	);

	const canUpsertNodeDescription = useMemo(() => {
		if (node) {
			return canUpsertDescription(node);
		}
		return false;
	}, [node]);

	useEffect(() => {
		if (
			((tab && !isExistingTab) || (activeNodeIsFile === false && isVersioningTab)) &&
			node.id != null
		) {
			setActiveNode(node.id, DISPLAYER_TABS.details);
		}
	}, [activeNodeIsFile, isExistingTab, isVersioningTab, node.id, setActiveNode, tab]);

	return (
		<>
			<DisplayerHeader
				name={node.name}
				type={node.type}
				closeAction={removeActiveNode}
				mimeType={node.__typename === 'File' ? node.mime_type : undefined}
				trashed={node.rootId === ROOTS.TRASH}
			/>
			<DisplayerActions node={node} />
			<DisplayerContentContainer
				height="fill"
				background="gray5"
				padding={{ horizontal: 'large' }}
				mainAlignment="flex-start"
				data-testid="displayer-content"
			>
				<Container mainAlignment="flex-start" height="fill">
					<TabBar
						items={tabs}
						selected={tab || DISPLAYER_TABS.details}
						onChange={tabOnChangeHandler}
						width="fill"
						height="3rem"
						minHeight="3rem"
						background="gray6"
					/>
					<Divider color="gray3" />
					{(isDetailsTab || !tab) && (
						<NodeDetails
							typeName={node.__typename}
							id={node.id}
							name={node.name}
							description={node.description}
							canUpsertDescription={canUpsertNodeDescription}
							createdAt={node.created_at}
							size={isFile(node) ? node.size : undefined}
							lastEditor={node.last_editor}
							owner={node.owner}
							creator={node.creator}
							updatedAt={node.updated_at}
							loading={loading}
							loadMore={loadMore}
							hasMore={hasMore}
							nodes={isFolder(node) ? node.children?.nodes : undefined}
							shares={node.shares}
							type={node.type}
							rootId={node.rootId || undefined}
							version={isFile(node) ? node.version : undefined}
							mimeType={isFile(node) ? node.mime_type : undefined}
						/>
					)}
					{isSharingTab && <NodeSharing node={node} />}
					{isVersioningTab && activeNodeIsFile && <Versioning node={node} />}
				</Container>
			</DisplayerContentContainer>
		</>
	);
};
