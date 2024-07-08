/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import {
	Action as DSAction,
	Button,
	Divider,
	IconButton,
	Row,
	Tooltip,
	Badge,
	CollapsingActions
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled, { SimpleInterpolation } from 'styled-components';

import { BREADCRUMB_ROW_HEIGHT } from '../../constants';
import { cssCalcBuilder } from '../../utils/utils';

const CustomCollapsingActions = styled(CollapsingActions)``;

const CollapsingActionsRow = styled(Row)<{ $maxVisible: number | undefined }>`
	--lh-collapsing-actions-max-width: ${({ $maxVisible }): SimpleInterpolation =>
		$maxVisible !== undefined ? cssCalcBuilder('2.25rem', ['*', $maxVisible]) : '100%'};
	max-width: var(--lh-collapsing-actions-max-width);
	${CustomCollapsingActions} {
		max-width: var(--lh-collapsing-actions-max-width);
	}
`;

export interface ListHeaderProps {
	isSelectionModeActive: boolean;
	unSelectAll: () => void;
	selectAll: () => void;
	isAllSelected: boolean;
	exitSelectionMode: () => void;
	permittedSelectionModeActionsItems: DSAction[];
	hide?: boolean;
	firstCustomComponent?: React.ReactNode;
	secondCustomComponent?: React.ReactNode;
	headerEndComponent?: React.ReactNode;
	selectedCount?: number;
}

const MAX_ACTIONS_VISIBLE = 3;

export const ListHeader = ({
	isSelectionModeActive,
	unSelectAll,
	selectAll,
	isAllSelected,
	exitSelectionMode,
	permittedSelectionModeActionsItems = [],
	hide = false,
	firstCustomComponent,
	secondCustomComponent,
	headerEndComponent,
	selectedCount
}: ListHeaderProps): React.JSX.Element => {
	const [t] = useTranslation();

	return !isSelectionModeActive ? (
		<>
			{!hide && (
				<>
					<Row
						minHeight={BREADCRUMB_ROW_HEIGHT}
						height="auto"
						background={'gray5'}
						mainAlignment={'space-between'}
						padding={{ left: 'medium' }}
						wrap={'nowrap'}
						width={'fill'}
						maxWidth={'100%'}
						data-testid="list-header"
						flexShrink={0}
						flexGrow={1}
						gap="medium"
					>
						{firstCustomComponent}
						<Row mainAlignment="flex-end" wrap="nowrap" width="auto">
							{headerEndComponent}
						</Row>
					</Row>
					<Divider color="gray3" />
				</>
			)}
			{secondCustomComponent}
		</>
	) : (
		<>
			<Row
				height={BREADCRUMB_ROW_HEIGHT}
				background={'gray5'}
				mainAlignment={'space-between'}
				padding={{ vertical: 'medium' }}
				wrap={'nowrap'}
				width={'fill'}
				maxWidth={'100%'}
				data-testid="list-header-selectionModeActive"
			>
				<Row mainAlignment="flex-start" wrap="nowrap" flexShrink={0} flexBasis="auto">
					<Tooltip label={t('selectionMode.header.exit', 'Exit selection mode')}>
						<IconButton
							icon="ArrowBackOutline"
							size="large"
							iconColor="primary"
							onClick={exitSelectionMode}
						/>
					</Tooltip>
					{isAllSelected ? (
						<Button
							type="ghost"
							label={t('selectionMode.header.unselectAll', 'Deselect all')}
							color="primary"
							onClick={unSelectAll}
							minWidth={'fit-content'}
						/>
					) : (
						<Button
							type="ghost"
							label={t('selectionMode.header.selectAll', 'Select all')}
							color="primary"
							onClick={selectAll}
							minWidth={'fit-content'}
						/>
					)}
				</Row>
				<Row mainAlignment="flex-end" flexShrink={1} flexGrow={1} gap="0.25rem" flexBasis="auto">
					{selectedCount !== undefined && selectedCount > 0 && (
						<Badge value={selectedCount} type="unread" />
					)}
				</Row>
				<CollapsingActionsRow
					mainAlignment="flex-end"
					wrap="nowrap"
					flexGrow={1}
					flexShrink={1}
					width={'100%'}
					minWidth={0}
					$maxVisible={
						permittedSelectionModeActionsItems.length > MAX_ACTIONS_VISIBLE
							? MAX_ACTIONS_VISIBLE + 1
							: permittedSelectionModeActionsItems.length
					}
				>
					<CustomCollapsingActions
						actions={permittedSelectionModeActionsItems}
						size={'large'}
						color={'primary'}
						maxVisible={3}
					/>
				</CollapsingActionsRow>
			</Row>
			<Divider color="gray3" />
		</>
	);
};
