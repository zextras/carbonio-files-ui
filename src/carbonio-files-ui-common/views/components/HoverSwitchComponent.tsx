/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Container } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

const StyledFirstComponent = styled(Container)``;
const StyledSecondComponent = styled(Container)`
	display: none;
`;

const DivContainer = styled.div`
	&:hover {
		& ${StyledFirstComponent} {
			display: none;
		}
		& ${StyledSecondComponent} {
			display: block;
		}
	}
`;

interface HoverSwitchComponentProps {
	visibleToHiddenComponent: React.ReactNode;
	hiddenToVisibleComponent: React.ReactNode;
}

export const HoverSwitchComponent: React.FC<HoverSwitchComponentProps> = ({
	visibleToHiddenComponent,
	hiddenToVisibleComponent
}) => (
	<DivContainer>
		<StyledFirstComponent>{visibleToHiddenComponent}</StyledFirstComponent>
		<StyledSecondComponent>{hiddenToVisibleComponent}</StyledSecondComponent>
	</DivContainer>
);
