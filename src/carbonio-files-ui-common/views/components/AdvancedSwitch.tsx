/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useRef } from 'react';

import { Container, Switch, Text } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

interface AdvancedSwitchProps {
	label: string;
	description: string;
	onChange: (value: boolean) => void;
	initialValue?: boolean;
}

const DescriptionText = styled(Text)`
	line-height: 1.5;
`;

export const AdvancedSwitch: React.VFC<AdvancedSwitchProps> = ({
	label,
	description,
	onChange,
	initialValue: value = false
}) => {
	const valueRef = useRef(value);

	useEffect(() => {
		valueRef.current = value;
	}, [value]);

	const onClick = useCallback((): void => {
		onChange(!valueRef.current);
	}, [onChange]);

	return (
		<Container padding={{ all: 'extrasmall' }} height="fit" crossAlignment="flex-start">
			<Switch
				onClick={onClick}
				value={value}
				// onChange={onChange}
				label={label}
				padding={{ bottom: 'small' }}
			/>
			<DescriptionText color="secondary" size="extrasmall" overflow="break-word">
				{description}
			</DescriptionText>
		</Container>
	);
};
