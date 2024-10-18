/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Button, ButtonProps } from '@zextras/carbonio-design-system';
import styled, { keyframes } from 'styled-components';

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const StyledButton = styled(Button)`
	animation: ${rotate} 1s linear infinite;
`;

export const LoadingIcon = React.forwardRef<HTMLDivElement, Partial<ButtonProps>>(
	function LoadingIconFn(
		{ onClick = (): void => undefined, type = 'ghost', shape = 'round', color = 'text', ...rest },
		ref
	) {
		return (
			<StyledButton onClick={onClick} type={type} shape={shape} color={color} {...rest} ref={ref} />
		);
	}
);
