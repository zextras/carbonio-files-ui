/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { Container, Padding, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import useUserInfo from '../../../hooks/useUserInfo';
import { LIST_ITEM_HEIGHT_DETAILS } from '../../constants';
import { Maybe, NodeType, User } from '../../types/graphql/types';
import { formatDate, getIconByFileType } from '../../utils/utils';
import { NodeAvatarIcon } from './NodeAvatarIcon';

interface NodeDetailsListItemProps {
	id: string;
	name: string;
	type: NodeType;
	mimeType?: Maybe<string>;
	owner?: Partial<User>;
	updatedAt?: number;
}

export const NodeDetailsListItem: React.VFC<NodeDetailsListItemProps> = ({
	id,
	type,
	name = '',
	owner,
	updatedAt,
	mimeType
}) => {
	const userInfo = useUserInfo();
	const [t] = useTranslation();

	const displayName = useMemo(() => {
		if (owner && owner.id !== userInfo.me) {
			return owner.full_name;
		}
		return t('displayer.list.you', 'You');
	}, [owner, t, userInfo.me]);

	return (
		<Container
			orientation="horizontal"
			id={id}
			data-testid={`details-node-item-${id}`}
			mainAlignment="flex-start"
			width="fill"
			height={LIST_ITEM_HEIGHT_DETAILS}
			padding={{ all: 'small' }}
			wrap="nowrap"
		>
			<NodeAvatarIcon
				selectionModeActive={false}
				selected={false}
				icon={getIconByFileType(type, mimeType)}
				compact
			/>
			<Container
				orientation="horizontal"
				flexGrow={2}
				mainAlignment="flex-start"
				padding={{ horizontal: 'small' }}
				minWidth={0}
			>
				<Text overflow="ellipsis" size="small">
					{name}
				</Text>
			</Container>
			<Padding right="extrasmall">
				<Text overflow="ellipsis" size="extrasmall">
					{displayName}
				</Text>
			</Padding>
			{updatedAt && (
				<>
					{displayName && <Text>&middot;</Text>}
					<Padding left="extrasmall">
						<Text color="gray1" size="extrasmall">
							{formatDate(updatedAt, 'DD/MM/YYYY', userInfo.zimbraPrefTimeZoneId)}
						</Text>
					</Padding>
				</>
			)}
		</Container>
	);
};
