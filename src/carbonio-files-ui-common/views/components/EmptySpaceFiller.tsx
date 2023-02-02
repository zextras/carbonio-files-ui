/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Container } from '@zextras/carbonio-design-system';
import { noop } from 'lodash';

import { ContextualMenu, ContextualMenuProps } from './ContextualMenu';

interface EmptySpaceFillerProps {
	actions: ContextualMenuProps['actions'];
	children?: React.ReactElement;
}

export const EmptySpaceFiller: React.VFC<EmptySpaceFillerProps> = ({ actions, children }) => (
	<Container height="unset" flexGrow={1}>
		<ContextualMenu actions={actions} onClose={noop} onOpen={noop} disableRestoreFocus>
			{children || <></>}
		</ContextualMenu>
	</Container>
);
