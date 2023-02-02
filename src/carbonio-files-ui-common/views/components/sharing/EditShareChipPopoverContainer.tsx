/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import {
	Container,
	Icon,
	Text,
	Padding,
	Divider,
	Checkbox,
	Button,
	pseudoClasses
} from '@zextras/carbonio-design-system';
import { includes, noop } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled, { SimpleInterpolation } from 'styled-components';

const ExclusiveSelectionContainer = styled(Container)<{ $disabled?: boolean; background: string }>`
	cursor: ${({ $disabled }): string => (!$disabled ? 'pointer' : 'default')};
	max-width: 16rem;
	${({ theme, background, $disabled }): SimpleInterpolation =>
		!$disabled && pseudoClasses(theme, background, 'background')};
`;

const CheckboxContainer = styled(Container)`
	max-width: 16rem;
	cursor: default;
`;

interface EditShareChipPopoverContainerProps {
	activeRow: number;
	disabledRows: number[];
	checkboxValue: boolean;
	checkboxOnClick: () => void;
	containerOnClick: (containerId: number) => void;
	saveDisabled: boolean;
	saveOnClick: () => void;
	closePopover: () => void;
}

export const EditShareChipPopoverContainer: React.FC<EditShareChipPopoverContainerProps> = ({
	activeRow = 0,
	disabledRows = [],
	checkboxValue = false,
	checkboxOnClick = noop,
	containerOnClick = noop,
	saveDisabled = false,
	saveOnClick = noop,
	closePopover = noop
}) => {
	const [t] = useTranslation();

	const container0Click = useCallback(() => containerOnClick(0), [containerOnClick]);
	const container1Click = useCallback(() => containerOnClick(1), [containerOnClick]);

	const row0disabled = useMemo(() => includes(disabledRows, 0), [disabledRows]);
	const row1disabled = useMemo(() => includes(disabledRows, 1), [disabledRows]);

	const saveCallback = useCallback(() => {
		saveOnClick();
		closePopover();
	}, [closePopover, saveOnClick]);

	return (
		<Container orientation="vertical" padding={{ all: 'extralarge' }}>
			<ExclusiveSelectionContainer
				$disabled={row0disabled}
				onClick={container0Click}
				padding={{ vertical: 'large', horizontal: 'small' }}
				orientation="horizontal"
				crossAlignment="flex-start"
				background={activeRow === 0 ? 'highlight' : 'gray6'}
				data-testid="exclusive-selection-viewer"
			>
				<Padding right="large">
					<Icon
						icon="EyeOutline"
						size="large"
						color={(row0disabled && 'secondary') || (activeRow === 0 && 'primary') || 'gray0'}
					/>
				</Padding>
				<Container orientation="vertical" crossAlignment="flex-start">
					<Text
						weight={activeRow === 0 ? 'bold' : 'regular'}
						color={(row0disabled && 'secondary') || (activeRow === 0 && 'primary') || 'text'}
						size="medium"
					>
						{t('displayer.share.chip.popover.role.viewer', 'Viewer')}
					</Text>
					<Text color="secondary" overflow="break-word" size="small">
						{t(
							'displayer.share.chip.popover.role.viewerDescription',
							'It will only be able to view or download the file or folder'
						)}
					</Text>
				</Container>
			</ExclusiveSelectionContainer>

			<ExclusiveSelectionContainer
				$disabled={row1disabled}
				onClick={container1Click}
				padding={{ vertical: 'large', horizontal: 'small' }}
				orientation="horizontal"
				crossAlignment="flex-start"
				background={activeRow === 1 ? 'highlight' : 'gray6'}
				data-testid="exclusive-selection-editor"
			>
				<Padding right="large">
					<Icon
						icon="Edit2Outline"
						size="large"
						color={(row1disabled && 'secondary') || (activeRow === 1 && 'primary') || 'gray0'}
					/>
				</Padding>
				<Container orientation="vertical" crossAlignment="flex-start">
					<Text
						weight={activeRow === 1 ? 'bold' : 'regular'}
						color={(row1disabled && 'secondary') || (activeRow === 1 && 'primary') || 'text'}
						size="medium"
					>
						{t('displayer.share.chip.popover.role.editor', 'Editor')}
					</Text>
					<Text color="secondary" overflow="break-word" size="small">
						{t(
							'displayer.share.chip.popover.role.editorDescription',
							'It will be able to view and edit the file or folder'
						)}
					</Text>
				</Container>
			</ExclusiveSelectionContainer>

			<Padding bottom="small" />
			<Divider color="gray3" />

			<CheckboxContainer
				padding={{ vertical: 'large', horizontal: 'small' }}
				orientation="horizontal"
				crossAlignment="flex-start"
			>
				<Padding right="large">
					<Checkbox
						size="medium"
						value={checkboxValue}
						onClick={(ev: Event): void => {
							ev.stopPropagation();
							if (checkboxOnClick) {
								checkboxOnClick();
							}
						}}
					/>
				</Padding>
				<Container orientation="vertical" crossAlignment="flex-start">
					<Text color="text" size="medium">
						{t('displayer.share.chip.popover.sharingAllowed', 'Sharing allowed')}
					</Text>
					<Text color="secondary" overflow="break-word" size="small">
						{t(
							'displayer.share.chip.popover.sharingAllowedDescription',
							'It will be able to manage shares for the file or folder'
						)}
					</Text>
				</Container>
			</CheckboxContainer>
			<Divider color="gray3" />
			<Container orientation="horizontal" mainAlignment="flex-end" padding={{ top: 'small' }}>
				<Button
					label={t('displayer.share.chip.popover.save', 'Save')}
					color="primary"
					disabled={saveDisabled}
					onClick={saveCallback}
				/>
			</Container>
		</Container>
	);
};
