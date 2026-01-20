/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import styled from '@emotion/styled';
import {
	Icon,
	Button,
	Padding,
	Text,
	Dropdown,
	Tooltip,
	Container,
	useSnackbar,
	DropdownItem
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useUserInfo } from '../../../../hooks/useUserInfo';
import { DATE_TIME_FORMAT } from '../../../constants';
import { CloneVersionType } from '../../../hooks/graphql/mutations/useCloneVersionMutation';
import { DeleteVersionsType } from '../../../hooks/graphql/mutations/useDeleteVersionsMutation';
import { KeepVersionsType } from '../../../hooks/graphql/mutations/useKeepVersionsMutation';
import { useDownloadNodes } from '../../../hooks/useDownloadNodes';
import { useOpenWithDocs } from '../../../hooks/useOpenWithDocs';
import { formatDate, humanFileSize } from '../../../utils/utils';
import { GridItem } from '../StyledComponents';

const CustomText = styled(Text)`
	line-height: 1.5;
`;

interface VersionRowProps {
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
}
export const VersionRow = ({
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
	version
}: VersionRowProps): React.JSX.Element => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const { locale } = useUserInfo();
	const openNodeWithDocs = useOpenWithDocs();
	const { downloadNode } = useDownloadNodes();

	const deleteVersionCallback = useCallback(() => {
		deleteVersions(nodeId, [version]);
	}, [deleteVersions, nodeId, version]);

	const keepVersionCallback = useCallback(() => {
		keepVersions(nodeId, [version], !keepVersionValue).then((data) => {
			if (data) {
				if (keepVersionValue) {
					createSnackbar({
						key: new Date().toLocaleString(),
						severity: 'info',
						label: t('snackbar.version.keepForeverRemoved', 'Keep forever removed'),
						replace: true,
						hideButton: true
					});
				} else {
					createSnackbar({
						key: new Date().toLocaleString(),
						severity: 'info',
						label: t('snackbar.version.keepForeverAdded', 'Version marked as to be kept forever'),
						replace: true,
						hideButton: true
					});
				}
			}
		});
	}, [createSnackbar, keepVersionValue, keepVersions, nodeId, t, version]);

	const cloneVersionCallback = useCallback(() => {
		cloneVersion(nodeId, version).then(({ data }) => {
			if (data) {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.version.clone', 'Version cloned as the current one'),
					replace: true,
					hideButton: true
				});
			}
		});
	}, [cloneVersion, createSnackbar, nodeId, t, version]);

	const downloadVersionCallback = useCallback(() => {
		downloadNode(nodeId, version);
	}, [downloadNode, nodeId, version]);

	const openVersionWithDocsCallback = useCallback(() => {
		openNodeWithDocs(nodeId, version);
	}, [nodeId, openNodeWithDocs, version]);

	const items = useMemo<DropdownItem[]>(
		() => [
			{
				id: 'openDocumentVersion',
				label: t('displayer.version.actions.openDocumentVersion', 'Open document version'),
				onClick: openVersionWithDocsCallback,
				icon: 'BookOpenOutline',
				disabled: !canOpenWithDocs,
				tooltipLabel: openWithDocsTooltip
			},
			{
				id: 'downloadVersion',
				label: t('displayer.version.actions.downloadVersion', 'Download version'),
				onClick: downloadVersionCallback,
				icon: 'Download'
			},
			{
				id: 'keepVersion',
				label: !keepVersionValue
					? t('displayer.version.actions.keepVersion', 'Keep this version forever')
					: t('displayer.version.actions.removeKeepVersion', 'Remove keep forever'),
				onClick: keepVersionCallback,
				icon: 'InfinityOutline',
				disabled: !canKeepVersion,
				tooltipLabel: keepVersionTooltip
			},
			{
				id: 'cloneAsCurrent',
				label: t('displayer.version.actions.cloneAsCurrent', 'Clone as current'),
				onClick: cloneVersionCallback,
				icon: 'Copy',
				disabled: !canCloneVersion,
				tooltipLabel: cloneVersionTooltip
			},
			{
				id: 'deleteVersion',
				label: t('displayer.version.actions.deleteVersion', 'Delete version'),
				onClick: deleteVersionCallback,
				icon: 'Trash2Outline',
				disabled: !canDelete,
				tooltipLabel: deleteTooltip
			}
		],
		[
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
		]
	);

	return (
		<>
			<GridItem
				padding={{ left: 'medium' }}
				mainAlignment={'flex-start'}
				orientation={'horizontal'}
				background={background}
				$rowStart={rowNumber}
				$rowEnd={rowNumber + 1}
				$columnStart={1}
				$columnEnd={2}
			>
				<CustomText weight="light" size="small">
					{formatDate(updatedAt, locale, DATE_TIME_FORMAT)}
				</CustomText>
			</GridItem>
			<GridItem
				padding={{ left: 'small', right: 'small' }}
				mainAlignment={'flex-start'}
				orientation={'horizontal'}
				background={background}
				$rowStart={rowNumber}
				$rowEnd={rowNumber + 1}
				$columnStart={2}
				$columnEnd={3}
			>
				<CustomText weight="light" size="small">
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
				$rowStart={rowNumber}
				$rowEnd={rowNumber + 1}
				$columnStart={3}
				$columnEnd={4}
			>
				<CustomText weight="light" size="small">
					{lastEditor}
				</CustomText>
			</GridItem>
			<GridItem
				mainAlignment={'flex-start'}
				orientation={'horizontal'}
				background={background}
				$rowStart={rowNumber}
				$rowEnd={rowNumber + 1}
				$columnStart={4}
				$columnEnd={5}
			>
				<CustomText weight="light" size="small">
					{humanFileSize(size, t)}
				</CustomText>
			</GridItem>
			<GridItem
				data-testid={`version${version}-icons`}
				padding={{ left: 'small', right: 'small' }}
				mainAlignment={'flex-end'}
				orientation={'horizontal'}
				background={background}
				$rowStart={rowNumber}
				$rowEnd={rowNumber + 1}
				$columnStart={5}
				$columnEnd={6}
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
												cloneDate: formatDate(cloneUpdatedAt, locale, {
													day: '2-digit',
													month: 'short'
												})
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
					<Button
						type={'ghost'}
						color={'text'}
						size="small"
						icon="MoreVertical"
						onClick={(): void => undefined}
					/>
				</Dropdown>
			</GridItem>
		</>
	);
};

export const SectionRow = ({
	rowNumber,
	background,
	children
}: React.PropsWithChildren<{
	rowNumber: number;
	background?: string;
}>): React.JSX.Element => (
	<GridItem
		mainAlignment={'flex-start'}
		orientation={'horizontal'}
		$rowStart={rowNumber}
		$rowEnd={rowNumber + 1}
		$columnStart={1}
		$columnEnd={6}
		background={background}
	>
		{children}
	</GridItem>
);
