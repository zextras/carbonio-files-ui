/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { Container, Padding, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';

import { NodeAvatarIcon } from './NodeAvatarIcon';
import useUserInfo from '../../../hooks/useUserInfo';
import { DATE_FORMAT, LIST_ITEM_HEIGHT_DETAILS } from '../../constants';
import { Maybe, NodeType, User } from '../../types/graphql/types';
import { formatDate, getIconByFileType, getIconColorByFileType } from '../../utils/utils';

interface NodeDetailsListItemProps {
	id: string;
	name: string;
	type: NodeType;
	mimeType?: Maybe<string>;
	owner?: Maybe<Partial<User>>;
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

	const theme = useTheme();

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
				color={getIconColorByFileType(type, mimeType || id, theme)}
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
							{formatDate(updatedAt, DATE_FORMAT, userInfo.zimbraPrefTimeZoneId)}
						</Text>
					</Padding>
				</>
			)}
		</Container>
	);
};
