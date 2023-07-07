/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Container } from '@zextras/carbonio-design-system';

import { SecondaryBar } from './secondary-bar/SecondaryBar';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import {
	GlobalProvidersWrapper,
	ViewProvidersWrapper
} from '../carbonio-files-ui-common/views/components/ProvidersWrapper';

interface SidebarViewProps {
	expanded: boolean;
}

const SidebarView: React.VFC<SidebarViewProps> = (props) => (
	<PreventDefaultDropContainer>
		<GlobalProvidersWrapper>
			<ViewProvidersWrapper>
				<Container mainAlignment="flex-start">
					<SecondaryBar {...props} />
				</Container>
			</ViewProvidersWrapper>
		</GlobalProvidersWrapper>
	</PreventDefaultDropContainer>
);

export default SidebarView;
