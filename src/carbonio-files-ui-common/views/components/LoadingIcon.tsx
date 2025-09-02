/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { Button, ButtonProps } from '@zextras/carbonio-design-system';

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

export const LoadingIcon = React.forwardRef<
	HTMLDivElement,
	Partial<Omit<ButtonProps, 'secondaryAction' | 'type' | 'labelColor' | 'backgroundColor'>>
>(function LoadingIconFn(
	{ onClick = (): void => undefined, shape = 'round', color = 'text', ...rest },
	ref
) {
	return (
		<StyledButton
			onClick={onClick}
			shape={shape}
			type={'ghost'}
			color={color}
			{...rest}
			ref={ref}
		/>
	);
});
