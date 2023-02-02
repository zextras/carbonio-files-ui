/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { Container, Icon, Padding, Row } from '@zextras/carbonio-design-system';
import { sample, map, debounce } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { ListContext } from '../../contexts';
import { OneOrMany } from '../../types/utils';
import { cssCalcBuilder } from '../../utils/utils';
import { CenteredText } from './StyledComponents';

interface EmptyDisplayerProps {
	icons: string[];
	translationKey: string;
}

const CustomIcon = styled(Icon)`
	height: ${({ theme }): string => cssCalcBuilder(theme.sizes.icon.medium, ['*', 2])};
	width: ${({ theme }): string => cssCalcBuilder(theme.sizes.icon.medium, ['*', 2])};
`;

export const EmptyDisplayer: React.VFC<EmptyDisplayerProps> = ({ icons, translationKey }) => {
	const [t] = useTranslation();
	const { isEmpty: listIsEmpty, queryCalled } = useContext(ListContext);
	const [randomPlaceholder, setRandomPlaceholder] = useState<{ title: string; message?: string }>();

	const iconItems = useMemo(
		() =>
			map(icons, (icon, index) => (
				<Padding horizontal="small" key={`${icon}-${index}`}>
					<CustomIcon icon={icon} color="secondary" />
				</Padding>
			)),
		[icons]
	);

	const placeholders = useMemo<OneOrMany<{ title: string; message?: string }>>(
		() =>
			/* i18next-extract-disable-next-line */
			t(translationKey, {
				context: (queryCalled !== false && ((listIsEmpty && 'empty') || 'full')) || '',
				returnObjects: true,
				defaultValue: [
					{
						title: t(
							'displayer.generic.title',
							'View files and folders, share them with your contacts'
						),
						message: t('displayer.generic.message', 'Click an item to select it')
					}
				]
			}),
		[listIsEmpty, queryCalled, t, translationKey]
	);

	const updatePlaceholder = useMemo(
		() =>
			debounce(
				($placeholders: OneOrMany<{ title: string; message?: string }>) => {
					const result =
						$placeholders instanceof Array
							? (sample($placeholders) as { title: string; message?: string })
							: $placeholders;
					setRandomPlaceholder(result);
				},
				250,
				{ leading: false, trailing: true }
			),
		[]
	);

	useEffect(() => {
		updatePlaceholder(placeholders);

		return (): void => {
			updatePlaceholder.cancel();
		};
	}, [placeholders, updatePlaceholder]);

	return (
		<Container>
			<Row>{iconItems}</Row>
			<Padding all="medium">
				<CenteredText color="gray1" overflow="break-word" weight="bold" size="large">
					{randomPlaceholder?.title || ''}
				</CenteredText>
			</Padding>
			<CenteredText size="small" color="gray1" overflow="break-word" $width="60%">
				{randomPlaceholder?.message || ''}
			</CenteredText>
		</Container>
	);
};
