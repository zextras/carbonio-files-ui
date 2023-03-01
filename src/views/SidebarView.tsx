/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Container } from '@zextras/carbonio-design-system';

import { ShellSecondaryBar } from './secondary-bar/secondary-bar';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import { ProvidersWrapper } from '../carbonio-files-ui-common/views/components/ProvidersWrapper';

interface SidebarViewProps {
	expanded: boolean;
}

const SidebarView: React.VFC<SidebarViewProps> = (props) => (
	<PreventDefaultDropContainer>
		<ProvidersWrapper>
			<Container mainAlignment="flex-start">
				<ShellSecondaryBar {...props} />
			</Container>
		</ProvidersWrapper>
	</PreventDefaultDropContainer>
);

export default SidebarView;
