/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { AnyColor, Button, ButtonProps } from '@zextras/carbonio-design-system';
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

export const LoadingIcon = React.forwardRef<
	HTMLDivElement,
	Partial<Omit<ButtonProps, 'secondaryAction'>>
>(function LoadingIconFn(
	{
		onClick = (): void => undefined,
		type = 'ghost',
		shape = 'round',
		color = 'text',
		labelColor,
		backgroundColor,
		...rest
	}: Partial<Omit<ButtonProps, 'secondaryAction'>>,
	ref
) {
	const colorAndType = useMemo<
		| { type: 'ghost'; color: AnyColor }
		| { type?: 'default' | 'outlined'; labelColor?: AnyColor; backgroundColor?: AnyColor }
	>(() => {
		if (type === 'ghost') {
			return { type, color };
		}
		if (type === 'outlined') {
			return { type, labelColor: labelColor ?? color, backgroundColor };
		}
		return { type, labelColor, backgroundColor: backgroundColor ?? color };
	}, [backgroundColor, color, labelColor, type]);

	return <StyledButton onClick={onClick} shape={shape} {...colorAndType} {...rest} ref={ref} />;
});
