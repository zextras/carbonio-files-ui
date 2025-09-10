/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import styled from '@emotion/styled';
import { Container, Icon, Padding, Row } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { CenteredText } from './StyledComponents';
import { cssCalcBuilder } from '../../utils/utils';

const CustomIcon = styled(Icon)`
	height: ${({ theme }): string => cssCalcBuilder(theme.sizes.icon.medium, ['*', 2])};
	width: ${({ theme }): string => cssCalcBuilder(theme.sizes.icon.medium, ['*', 2])};
`;

export const UploadFailureEmptyDisplayer = (): React.JSX.Element => {
	const [t] = useTranslation();

	return (
		<Container>
			<Row>
				<CustomIcon icon={'AlertCircleOutline'} color="error" />
			</Row>
			<Padding all="medium">
				<CenteredText color="gray1" overflow="break-word" weight="bold" size="large">
					{t('displayer.uploadFailure.title', 'Upload suggestions')}
				</CenteredText>
			</Padding>
			<CenteredText size="small" color="gray1" overflow="break-word" $width="60%">
				{t(
					'displayer.uploadFailure.message',
					'Here you can find all the items that are currently uploading. If a file failed to upload, click on it to see more details.'
				)}
			</CenteredText>
		</Container>
	);
};
