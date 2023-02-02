/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import { Avatar, Row, Shimmer, Text, Tooltip } from '@zextras/carbonio-design-system';
import { reduce } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { useActiveNode } from '../../../hooks/useActiveNode';
import { DISPLAYER_TABS } from '../../constants';
import { DistributionList, Maybe, Share, User } from '../../types/graphql/types';
import { NonNullableListItem } from '../../types/utils';
import { getChipLabel } from '../../utils/utils';

const CustomAvatar = styled(Avatar).attrs({ 'data-testid': 'avatar' })`
	margin-right: -0.25rem;
	cursor: pointer;
`;

export interface CollaboratorsRowProps {
	shares: Array<
		| Maybe<
				Pick<Share, 'created_at'> & {
					share_target?: Maybe<User | Partial<DistributionList>>;
				}
		  >
		| undefined
	>;
	loading: boolean | undefined;
}

export const CollaboratorsRow = ({ shares, loading }: CollaboratorsRowProps): JSX.Element => {
	const [t] = useTranslation();

	const { activeNodeId, setActiveNode } = useActiveNode();

	const openShareTab = useCallback(() => {
		if (activeNodeId) {
			setActiveNode(activeNodeId, DISPLAYER_TABS.sharing);
		}
	}, [activeNodeId, setActiveNode]);

	const collaborators = useMemo(() => {
		const collaboratorsToShow = 5;
		return reduce<NonNullableListItem<typeof shares> | null | undefined, JSX.Element[]>(
			shares,
			(avatars, share, index) => {
				if (share) {
					// show first 5 collaborators avatar
					if (share.share_target && index < collaboratorsToShow) {
						const label = getChipLabel(share.share_target);
						avatars.push(
							<Tooltip
								key={`${share.share_target.id}-tip`}
								label={t('displayer.details.collaboratorsTooltip', 'See the list of collaborators')}
							>
								<CustomAvatar key={share.share_target.id} label={label} onClick={openShareTab} />
							</Tooltip>
						);
					} else if (index === collaboratorsToShow) {
						// if there is a 6th collaborator, then show a special avatar to let user know there are more
						avatars.push(
							<Tooltip
								key="showMoreAvatar-tip"
								label={t('displayer.details.collaboratorsTooltip', 'See the list of collaborators')}
							>
								<CustomAvatar
									key="showMoreAvatar"
									label="..."
									icon="MoreHorizontalOutline"
									background={'primary'}
									onClick={openShareTab}
								/>
							</Tooltip>
						);
					} else if (loading) {
						avatars.push(
							<Shimmer.Avatar
								key={`avatar-shim-${index}`}
								data-testid="shimmer-avatar"
								size="medium"
							/>
						);
					}
				}
				return avatars;
			},
			[]
		);
	}, [loading, openShareTab, shares, t]);

	return (
		<Row mainAlignment={'flex-start'}>
			{shares && shares.length > 0 && (
				<>
					<Text weight={'bold'} size={'small'}>
						{t('displayer.details.collaborators', 'Collaborators')}
					</Text>
					<Row padding={{ horizontal: 'small' }}>{collaborators}</Row>
				</>
			)}
		</Row>
	);
};
