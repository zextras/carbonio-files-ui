/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { ApolloError } from '@apollo/client';
import { Container } from '@zextras/carbonio-design-system';
import { map } from 'lodash';
import { useTranslation } from 'react-i18next';

import { NodeDetailsUserRow } from '../../../components/NodeDetailsUserRow';
import { Node } from '../../types/common';
import { ChildFragment, Maybe, NodeType, User } from '../../types/graphql/types';
import { humanFileSize, isFile, isFolder, isSupportedByPreview } from '../../utils/utils';
import { CollaboratorsRow, CollaboratorsRowProps } from './CollaboratorsRow';
import { DisplayerPreview } from './DisplayerPreview';
import { InternalLinkShortcut } from './InternalLinkShortcut';
import { NodeContent } from './NodeContent';
import { NodeDetailsDescription } from './NodeDetailsDescription';
import { NodeDetailsListItem } from './NodeDetailsListItem';
import { PathRow } from './PathRow';
import { DisplayerContentContainer } from './StyledComponents';
import { TextRowWithShim } from './TextRowWithShim';

interface NodeDetailsProps {
	typeName: Node['__typename'];
	id: string;
	name: string;
	owner: Partial<User>;
	creator: Partial<User>;
	lastEditor?: Maybe<Partial<User>>;
	size?: number;
	createdAt: number;
	updatedAt: number;
	description: string | undefined;
	canUpsertDescription: boolean;
	downloads?: number;
	nodes?: Array<Maybe<ChildFragment> | undefined>;
	hasMore?: boolean;
	loadMore: () => void;
	loading: boolean;
	error?: ApolloError;
	shares: CollaboratorsRowProps['shares'];
	type: NodeType;
	rootId?: string;
	version?: number;
	mimeType?: string;
}

export const NodeDetails: React.VFC<NodeDetailsProps> = ({
	typeName,
	id,
	name,
	owner,
	creator,
	lastEditor,
	size,
	createdAt,
	updatedAt,
	description,
	canUpsertDescription,
	nodes,
	hasMore,
	loadMore,
	loading,
	shares,
	type,
	rootId,
	version,
	mimeType
}) => {
	const [t] = useTranslation();
	const [$isSupportedByPreview, previewType] = useMemo(
		() => isSupportedByPreview(mimeType, 'thumbnail'),
		[mimeType]
	);

	const nodeIsFile = useMemo(() => isFile({ __typename: typeName }), [typeName]);
	const nodeIsFolder = useMemo(() => isFolder({ __typename: typeName }), [typeName]);

	const nodeContentItems = useMemo(
		() =>
			map(
				nodes,
				(node) =>
					node && (
						<NodeDetailsListItem
							key={node.id}
							id={node.id}
							name={node.name}
							type={node.type}
							owner={node.owner}
							updatedAt={node.updated_at}
						/>
					)
			),
		[nodes]
	);

	return (
		<Container
			mainAlignment={'flex-start'}
			background={'gray5'}
			height={'auto'}
			maxHeight={'100%'}
			data-testid="node-details"
			gap="0.75rem"
		>
			<Container background={'gray6'} height={'auto'}>
				{$isSupportedByPreview && previewType && (
					<Container padding={{ all: 'small' }} height={'auto'}>
						<DisplayerPreview id={id} version={version} type={type} mimeType={mimeType} />
					</Container>
				)}
				<DisplayerContentContainer
					mainAlignment={'flex-start'}
					crossAlignment={'flex-start'}
					height={'fit'}
					padding={{ all: 'large' }}
				>
					<Container
						orientation={'horizontal'}
						mainAlignment={'space-between'}
						width={'fill'}
						padding={{ vertical: 'small' }}
					>
						<CollaboratorsRow shares={shares} loading={loading} />
						<InternalLinkShortcut id={id} type={type} />
					</Container>
					{nodeIsFile && (
						<TextRowWithShim
							loading={loading}
							label={t('displayer.details.size', 'Size')}
							content={(size !== undefined && humanFileSize(size)) || undefined}
							shimmerWidth="5rem"
						/>
					)}
					<PathRow id={id} name={name} type={type} rootId={rootId} />
					<NodeDetailsUserRow
						key={'NodeDetailsUserRow-Owner'}
						label={t('displayer.details.owner', 'Owner')}
						user={owner}
						loading={loading && owner === undefined}
					/>
					<NodeDetailsUserRow
						key={'NodeDetailsUserRow-Creator'}
						label={t('displayer.details.createdBy', 'Created by')}
						user={creator}
						dateTime={createdAt}
						loading={loading && creator === undefined}
					/>
					<NodeDetailsUserRow
						key={'NodeDetailsUserRow-LastEditor'}
						label={t('displayer.details.lastEdit', 'Last edit')}
						user={lastEditor}
						dateTime={updatedAt}
						loading={loading && lastEditor === undefined}
					/>
					<NodeDetailsDescription
						canUpsertDescription={canUpsertDescription}
						description={description}
						id={id}
						key={`NodeDetailsDescription${id}`}
						loading={loading && description === undefined}
					/>
				</DisplayerContentContainer>
			</Container>
			{nodeIsFolder && (nodes || loading) && (
				<NodeContent id={id} loading={loading} hasMore={hasMore} loadMore={loadMore}>
					{nodeContentItems}
				</NodeContent>
			)}
		</Container>
	);
};
