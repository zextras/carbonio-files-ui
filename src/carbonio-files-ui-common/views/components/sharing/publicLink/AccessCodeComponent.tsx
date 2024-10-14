/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useState } from 'react';

import {
	Chip,
	Container,
	IconButtonProps,
	Row,
	Text,
	Tooltip,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { copyToClipboard } from '../../../../utils/utils';

export const AccessCodeComponent = ({ accessCode }: { accessCode: string }): React.JSX.Element => {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();
	const [showAccessCode, setShowAccessCode] = useState(false);

	const copyAccessCode = useCallback(() => {
		if (accessCode) {
			copyToClipboard(accessCode).then(() => {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.clipboard.accessCodeCopied', 'Access code copied'),
					replace: true,
					hideButton: true
				});
			});
		}
	}, [accessCode, createSnackbar, t]);

	const showActionCallback = useCallback<IconButtonProps['onClick']>((ev) => {
		ev.stopPropagation();
		setShowAccessCode((prevState) => !prevState);
	}, []);

	return (
		<Container orientation="horizontal" mainAlignment={'flex-end'} padding={{ top: 'small' }}>
			<Text overflow="break-word" color="gray1" size="small">
				{t('publicLink.accessCode.chip.label', 'Access code:')}
			</Text>
			<Chip
				actions={[
					{
						id: 'show',
						label: showAccessCode
							? t('publicLink.accessCode.chip.tooltip.actionShow.hide', 'Hide access code')
							: t('publicLink.accessCode.chip.tooltip.actionShow.show', 'Show access code'),
						type: 'button',
						icon: showAccessCode ? 'EyeOutline' : 'EyeOffOutline',
						onClick: showActionCallback
					}
				]}
				label={
					<Tooltip
						label={t('publicLink.accessCode.chip.tooltip', 'Copy access code')}
						maxWidth="unset"
						placement="top"
					>
						<Row wrap="nowrap" minWidth={0}>
							<Text size="small" weight="light">
								{showAccessCode ? accessCode : '**********'}
							</Text>
						</Row>
					</Tooltip>
				}
				hasAvatar={false}
				onClick={copyAccessCode}
				minWidth={0}
				maxWidth="100%"
			/>
		</Container>
	);
};
