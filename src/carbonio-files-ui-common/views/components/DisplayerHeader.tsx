/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Button, Container, Divider, Icon, Row, Text } from '@zextras/carbonio-design-system';
import { useTheme } from 'styled-components';

import { Maybe, NodeType } from '../../types/graphql/types';
import { getIconByFileType, getIconColorByFileType } from '../../utils/utils';

interface DisplayerHeaderParams {
	name: string;
	type: NodeType;
	mimeType?: Maybe<string>;
	closeAction: () => void;
	trashed?: boolean;
}

export const DisplayerHeader = React.memo<DisplayerHeaderParams>(
	({ name, type, mimeType, closeAction, trashed }) => {
		const theme = useTheme();
		return (
			<>
				<Container
					data-testid="DisplayerHeader"
					orientation="horizontal"
					height="3rem"
					background="gray5"
					mainAlignment="space-between"
					crossAlignment="center"
					padding={{ left: 'large', right: 'extrasmall' }}
					style={{ minHeight: '3rem' }}
				>
					<Icon
						size="large"
						icon={(trashed && 'Trash2Outline') || getIconByFileType(type, mimeType)}
						color={getIconColorByFileType(type, mimeType, theme)}
					/>
					<Row mainAlignment="flex-start" padding={{ left: 'large' }} takeAvailableSpace>
						<Text>{name}</Text>
					</Row>
					<Button icon="Close" onClick={closeAction} type={'ghost'} color={'text'} />
				</Container>
				<Divider color="gray3" />
			</>
		);
	}
);

DisplayerHeader.displayName = 'DisplayerHeader';
