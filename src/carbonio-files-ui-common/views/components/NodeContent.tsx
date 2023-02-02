/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Container, Padding, Shimmer, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { LIST_ITEM_HEIGHT_DETAILS } from '../../constants';
import { EmptyFolder } from './EmptyFolder';
import { ScrollContainer } from './ScrollContainer';
import { DisplayerContentContainer, ShimmerText } from './StyledComponents';

const ShimmerNodeDetailsItem = (): JSX.Element => (
	<Container
		orientation="horizontal"
		mainAlignment="flex-start"
		width="fill"
		height={LIST_ITEM_HEIGHT_DETAILS}
		padding={{ all: 'small' }}
	>
		<Container width="fit" height="fit">
			<Shimmer.Avatar size="medium" radius="0.5rem" />
		</Container>
		<Padding horizontal="small">
			<ShimmerText $size="small" width="9.375rem" />
		</Padding>
		<Container orientation="horizontal" mainAlignment="flex-end">
			<ShimmerText $size="small" width="3.75rem" />
		</Container>
	</Container>
);

interface NodeContentProps {
	children?: React.ReactNode[];
	id: string;
	loading: boolean;
	hasMore?: boolean;
	loadMore?: () => void;
}

export const NodeContent = ({
	hasMore,
	id,
	loadMore,
	loading,
	children
}: NodeContentProps): JSX.Element => {
	const [t] = useTranslation();

	return (
		<DisplayerContentContainer
			mainAlignment={'flex-start'}
			crossAlignment={'flex-start'}
			minHeight={children && children.length > 7 ? '25rem' : '0rem'}
			data-testid={`details-list-${id || ''}`}
			background={'gray6'}
			padding={{ all: 'large' }}
			height={'auto'}
			flexGrow={1}
			flexShrink={1}
		>
			<Padding bottom="large">
				<Text>{t('displayer.details.content', 'Content')}</Text>
			</Padding>
			{children && children.length > 0 && (
				<ScrollContainer hasMore={hasMore} loadMore={loadMore} loading={loading}>
					{children}
				</ScrollContainer>
			)}
			{!loading && (!children || children.length === 0) && (
				<EmptyFolder
					message={t('empty.folder.displayerContent', 'This folder has no content')}
					size="extrasmall"
					weight="regular"
				/>
			)}
			{loading && !children && <ShimmerNodeDetailsItem />}
		</DisplayerContentContainer>
	);
};
