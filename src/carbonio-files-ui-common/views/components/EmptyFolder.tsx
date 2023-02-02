/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Container, Padding, Row } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { CenteredText } from './StyledComponents';

interface EmptyFolderProps {
	mainList?: boolean;
	size?: 'extrasmall' | 'small' | 'medium' | 'large';
	weight?: 'light' | 'regular' | 'medium' | 'bold';
	message: string;
}

export const EmptyFolder = React.forwardRef<HTMLDivElement, EmptyFolderProps>(
	function EmptyFolderFn(
		{ mainList = false, size = 'medium', weight = 'bold', message, ...rest },
		ref
	) {
		const [t] = useTranslation();
		return (
			<Container
				data-testid="emptyFolder"
				ref={ref}
				mainAlignment="space-evenly"
				maxHeight="fill"
				{...rest}
			>
				<Row
					flexGrow={1}
					flexBasis="auto"
					minHeight="0"
					wrap="nowrap"
					orientation="vertical"
					mainAlignment="center"
					padding={{ vertical: 'extralarge' }}
				>
					{mainList && (
						<Padding horizontal="small" vertical="extrasmall">
							<CenteredText size={size} color="gray1" overflow="break-word">
								{t('empty.folder.state', 'Drag a file or create a new one clicking "NEW"')}
							</CenteredText>
						</Padding>
					)}
					<Padding horizontal="small" vertical="extrasmall">
						<CenteredText size={size} color="gray1" weight={weight} overflow="break-word">
							{message}
						</CenteredText>
					</Padding>
				</Row>
			</Container>
		);
	}
);
