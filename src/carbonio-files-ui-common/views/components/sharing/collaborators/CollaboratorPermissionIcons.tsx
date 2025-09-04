/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import styled from '@emotion/styled';
import { Container, Icon } from '@zextras/carbonio-design-system';

import { SharePermission } from '../../../../types/graphql/types';

const StyledIcon = styled(Icon)`
	width: 1rem;
	min-width: 1rem;
	height: 1rem;
	min-height: 1rem;
`;

interface CollaboratorPermissionIconsProps {
	permission: SharePermission;
}

export const CollaboratorPermissionIcons = ({
	permission
}: CollaboratorPermissionIconsProps): React.JSX.Element => (
	<Container
		mainAlignment={'flex-start'}
		crossAlignment={'flex-start'}
		orientation={'horizontal'}
		gap={'0.5rem'}
		width={'fit'}
	>
		<StyledIcon
			icon={
				permission === SharePermission.ReadAndWrite ||
				permission === SharePermission.ReadWriteAndShare
					? 'Edit2Outline'
					: 'EyeOutline'
			}
			color="currentColor"
		/>
		<StyledIcon
			icon={
				permission === SharePermission.ReadAndShare ||
				permission === SharePermission.ReadWriteAndShare
					? 'Share'
					: 'ShareOff'
			}
			color="currentColor"
		/>
	</Container>
);
