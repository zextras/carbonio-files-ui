/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import {
	Icon,
	IconButton,
	Padding,
	Text,
	Dropdown,
	Tooltip,
	Container,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { forEach } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { DropdownListItemContent } from '../../../design_system_fork/DropdownListItemComponent';
import { CloneVersionType } from '../../../hooks/graphql/mutations/useCloneVersionMutation';
import { DeleteVersionsType } from '../../../hooks/graphql/mutations/useDeleteVersionsMutation';
import { KeepVersionsType } from '../../../hooks/graphql/mutations/useKeepVersionsMutation';
import { downloadNode, formatDate, humanFileSize, openNodeWithDocs } from '../../../utils/utils';
import { GridItem } from './GridElements';

const CustomText = styled(Text).attrs({ weight: 'light', size: 'small' })`
	line-height: 1.5;
`;

interface DropdownItemComponentProps {
	label: string;
	icon?: string;
	disabled?: boolean;
	selected?: boolean;
	tooltipLabel?: string;
}

type DropdownItem = {
	type?: 'divider';
	id: string;
	label: string;
	icon?: string;
	click?: (e: React.SyntheticEvent<HTMLElement> | KeyboardEvent) => void;
	selected?: boolean;
	customComponent?: React.ReactNode;
	disabled?: boolean;
	items?: Array<DropdownItem>;
	keepOpen?: boolean;
	tooltipLabel?: string;
};

const DropdownItemComponent = ({
	label,
	icon,
	disabled,
	selected,
	tooltipLabel
}: DropdownItemComponentProps): JSX.Element => (
	<Tooltip
		disabled={!disabled || !tooltipLabel}
		label={tooltipLabel}
		placement="bottom-end"
		maxWidth="100%"
	>
		<DropdownListItemContent label={label} selected={selected} disabled={disabled} icon={icon} />
	</Tooltip>
);

export const VersionRow: React.VFC<{
	background?: string;
	canCloneVersion: boolean;
	cloneVersionTooltip?: string;
	canDelete: boolean;
	deleteTooltip?: string;
	canKeepVersion: boolean;
	keepVersionTooltip?: string;
	canOpenWithDocs: boolean;
	openWithDocsTooltip?: string;
	clonedFromVersion?: number;
	cloneUpdatedAt?: number;
	cloneVersion: CloneVersionType;
	deleteVersions: DeleteVersionsType;
	keepVersions: KeepVersionsType;
	keepVersionValue: boolean;
	lastEditor: string;
	nodeId: string;
	rowNumber: number;
	size: number;
	updatedAt: number;
	version: number;
	zimbraPrefTimeZoneId: string;
}> = ({
	background,
	canCloneVersion,
	cloneVersionTooltip,
	canDelete,
	deleteTooltip,
	canKeepVersion,
	keepVersionTooltip,
	canOpenWithDocs,
	openWithDocsTooltip,
	clonedFromVersion,
	cloneUpdatedAt,
	cloneVersion,
	deleteVersions,
	keepVersions,
	keepVersionValue = false,
	lastEditor,
	nodeId,
	rowNumber,
	size,
	updatedAt,
	version,
	zimbraPrefTimeZoneId
}) => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();

	const deleteVersionCallback = useCallback(() => {
		deleteVersions(nodeId, [version]);
	}, [deleteVersions, nodeId, version]);

	const keepVersionCallback = useCallback(() => {
		keepVersions(nodeId, [version], !keepVersionValue).then((data) => {
			if (data) {
				if (keepVersionValue) {
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'info',
						label: t('snackbar.version.keepForeverRemoved', 'Keep forever removed'),
						replace: true,
						hideButton: true
					});
				} else {
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'info',
						label: t('snackbar.version.keepForeverAdded', 'Version marked as to be kept forever'),
						replace: true,
						hideButton: true
					});
				}
			}
		});
	}, [createSnackbar, keepVersionValue, keepVersions, nodeId, t, version]);

	const cloneVersionCallback = useCallback(() => {
		cloneVersion(nodeId, version).then((data) => {
			if (data) {
				createSnackbar({
					key: new Date().toLocaleString(),
					type: 'info',
					label: t('snackbar.version.clone', 'Version cloned as the current one'),
					replace: true,
					hideButton: true
				});
			}
		});
	}, [cloneVersion, createSnackbar, nodeId, t, version]);

	const downloadVersionCallback = useCallback(() => {
		downloadNode(nodeId, version);
	}, [nodeId, version]);

	const openVersionWithDocsCallback = useCallback(() => {
		openNodeWithDocs(nodeId, version);
	}, [nodeId, version]);

	const items = useMemo<DropdownItem[]>(() => {
		const actions: DropdownItem[] = [
			{
				id: 'openDocumentVersion',
				label: t('displayer.version.actions.openDocumentVersion', 'Open document version'),
				click: openVersionWithDocsCallback,
				icon: 'BookOpenOutline',
				disabled: !canOpenWithDocs,
				tooltipLabel: openWithDocsTooltip
			},
			{
				id: 'downloadVersion',
				label: t('displayer.version.actions.downloadVersion', 'Download version'),
				click: downloadVersionCallback,
				icon: 'Download'
			},
			{
				id: 'keepVersion',
				label: !keepVersionValue
					? t('displayer.version.actions.keepVersion', 'Keep this version forever')
					: t('displayer.version.actions.removeKeepVersion', 'Remove keep forever'),
				click: keepVersionCallback,
				icon: 'InfinityOutline',
				disabled: !canKeepVersion,
				tooltipLabel: keepVersionTooltip
			},
			{
				id: 'cloneAsCurrent',
				label: t('displayer.version.actions.cloneAsCurrent', 'Clone as current'),
				click: cloneVersionCallback,
				icon: 'Copy',
				disabled: !canCloneVersion,
				tooltipLabel: cloneVersionTooltip
			},
			{
				id: 'deleteVersion',
				label: t('displayer.version.actions.deleteVersion', 'Delete version'),
				click: deleteVersionCallback,
				icon: 'Trash2Outline',
				disabled: !canDelete,
				tooltipLabel: deleteTooltip
			}
		];

		forEach(actions, (action) => {
			action.customComponent = (
				<DropdownItemComponent
					label={action.label}
					disabled={action.disabled}
					icon={action.icon}
					selected={action.selected}
					tooltipLabel={action.tooltipLabel}
				/>
			);
		});

		return actions;
	}, [
		canCloneVersion,
		canDelete,
		canKeepVersion,
		canOpenWithDocs,
		cloneVersionCallback,
		cloneVersionTooltip,
		deleteTooltip,
		deleteVersionCallback,
		downloadVersionCallback,
		keepVersionCallback,
		keepVersionTooltip,
		keepVersionValue,
		openVersionWithDocsCallback,
		openWithDocsTooltip,
		t
	]);

	return (
		<>
			<GridItem
				padding={{ left: 'medium' }}
				mainAlignment={'flex-start'}
				orientation={'horizontal'}
				background={background}
				rowStart={rowNumber}
				rowEnd={rowNumber + 1}
				columnStart={1}
				columnEnd={2}
			>
				<CustomText>{formatDate(updatedAt, 'DD/MM/YY HH:mm', zimbraPrefTimeZoneId)}</CustomText>
			</GridItem>
			<GridItem
				padding={{ left: 'small', right: 'small' }}
				mainAlignment={'flex-start'}
				orientation={'horizontal'}
				background={background}
				rowStart={rowNumber}
				rowEnd={rowNumber + 1}
				columnStart={2}
				columnEnd={3}
			>
				<CustomText>
					{t('displayer.version.row.versionNumber', 'Version {{versionNumber}}', {
						replace: { versionNumber: version }
					})}
				</CustomText>
			</GridItem>
			<GridItem
				padding={{ right: 'small' }}
				mainAlignment={'flex-start'}
				orientation={'horizontal'}
				background={background}
				rowStart={rowNumber}
				rowEnd={rowNumber + 1}
				columnStart={3}
				columnEnd={4}
			>
				<CustomText>{lastEditor}</CustomText>
			</GridItem>
			<GridItem
				mainAlignment={'flex-start'}
				orientation={'horizontal'}
				background={background}
				rowStart={rowNumber}
				rowEnd={rowNumber + 1}
				columnStart={4}
				columnEnd={5}
			>
				<CustomText>{humanFileSize(size)}</CustomText>
			</GridItem>
			<GridItem
				data-testid={`version${version}-icons`}
				padding={{ left: 'small', right: 'small' }}
				mainAlignment={'flex-end'}
				orientation={'horizontal'}
				background={background}
				rowStart={rowNumber}
				rowEnd={rowNumber + 1}
				columnStart={5}
				columnEnd={6}
			>
				{keepVersionValue && (
					<Padding right="medium">
						<Icon size="medium" icon="InfinityOutline" color="primary" />
					</Padding>
				)}
				{clonedFromVersion && (
					<Tooltip
						placement="top-end"
						label={
							cloneUpdatedAt
								? t(
										'displayer.version.row.clonedIcon.tooltip1',
										'Cloned from version {{versionNumber}} ({{cloneDate}})',
										{
											replace: {
												versionNumber: clonedFromVersion,
												cloneDate: formatDate(cloneUpdatedAt, 'DD MMM', zimbraPrefTimeZoneId)
											}
										}
								  )
								: t(
										'displayer.version.row.clonedIcon.tooltip2',
										'Cloned from version {{versionNumber}} (version deleted)',
										{
											replace: { versionNumber: clonedFromVersion }
										}
								  )
						}
					>
						<Container width="fit" padding={{ right: 'medium' }}>
							<Icon size="medium" icon="Copy" />
						</Container>
					</Tooltip>
				)}
				<Dropdown placement="bottom-end" items={items}>
					<IconButton size="small" icon="MoreVerticalOutline" onClick={(): void => undefined} />
				</Dropdown>
			</GridItem>
		</>
	);
};

export const SectionRow: React.FC<{
	rowNumber: number;
	background?: string;
}> = ({ rowNumber, background, children }) => (
	<GridItem
		mainAlignment={'flex-start'}
		orientation={'horizontal'}
		rowStart={rowNumber}
		rowEnd={rowNumber + 1}
		columnStart={1}
		columnEnd={6}
		background={background}
	>
		{children}
	</GridItem>
);
