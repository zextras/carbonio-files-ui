/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Padding, Row, Text, Tooltip } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

import { ShimmerText } from './StyledComponents';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { DATE_TIME_FORMAT } from '../../constants';
import { User } from '../../types/graphql/types';
import { formatDate } from '../../utils/utils';

const MainText = styled(Text)`
	flex: 0 0 auto;
	cursor: default;
`;

const SecondaryText = styled(Text)`
	flex: 1 1 4ex;
	min-width: 4ex;
	cursor: pointer;
`;

const DateText = styled(Text)`
	cursor: default;
	flex-shrink: 0;
	margin-right: 0;
	margin-left: auto;
	padding-left: ${({ theme }): string => theme.sizes.padding.extralarge};
`;

const Label = ({ children }: React.PropsWithChildren): React.JSX.Element => (
	<Padding bottom="small">
		<Text color="secondary" size="small">
			{children}
		</Text>
	</Padding>
);

export interface NodeDetailsUserRowProps {
	user: Partial<User> | null | undefined;
	label: string;
	tooltip: string;
	dateTime?: number;
	clickAction?: (event: React.MouseEvent<HTMLElement> | KeyboardEvent) => void;
	loading?: boolean;
}

export const NodeDetailsUserRow = ({
	user,
	label,
	tooltip,
	dateTime,
	clickAction,
	loading
}: NodeDetailsUserRowProps): React.JSX.Element | null => {
	const { locale } = useUserInfo();

	return (
		((loading || user) && (
			<Row
				orientation="vertical"
				crossAlignment="flex-start"
				padding={{ vertical: 'small' }}
				width="fill"
			>
				<Label>{label}</Label>
				<Row mainAlignment="flex-start" wrap="nowrap" width="fill" crossAlignment="baseline">
					{loading && <ShimmerText $size="medium" width="100%" />}
					{!loading && user && (
						<>
							<Row
								mainAlignment="flex-start"
								flexBasis={`${(user.full_name?.length || 0) + 10}ex`}
								flexShrink={1}
								flexGrow={1}
								minWidth="0"
							>
								{user.full_name && (
									<>
										<MainText>{user.full_name || ''}</MainText>
										<Padding horizontal="extrasmall">
											<Text color="secondary">|</Text>
										</Padding>
									</>
								)}
								<Tooltip label={tooltip} placement="bottom-start">
									<SecondaryText color="secondary" onClick={clickAction}>
										{user.email ?? ''}
									</SecondaryText>
								</Tooltip>
							</Row>
							{dateTime && (
								<DateText size="small">{formatDate(dateTime, locale, DATE_TIME_FORMAT)}</DateText>
							)}
						</>
					)}
				</Row>
			</Row>
		)) ||
		null
	);
};
