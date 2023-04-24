/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { IconButton, IconButtonProps } from '@zextras/carbonio-design-system';
import { noop } from 'lodash';
import styled, { keyframes } from 'styled-components';

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const StyledIconButton = styled(IconButton)`
	animation: ${rotate} 1s linear infinite;
`;

interface LoadingIconButtonProps extends Omit<IconButtonProps, 'onClick'> {
	onClick?: IconButtonProps['onClick'];
}

export const LoadingIcon = React.forwardRef<HTMLDivElement, LoadingIconButtonProps>(
	function LoadingIconFn({ onClick, type = 'ghost', shape = 'round', ...rest }, ref) {
		return (
			<StyledIconButton onClick={onClick || noop} type={type} shape={shape} {...rest} ref={ref} />
		);
	}
);
