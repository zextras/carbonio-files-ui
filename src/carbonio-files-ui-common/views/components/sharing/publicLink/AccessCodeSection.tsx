/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo, useState } from 'react';

import {
	Button,
	Container,
	Icon,
	Input,
	Switch,
	Tooltip,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { copyToClipboard } from '../../../../utils/utils';

interface AccessCodeSectionProps {
	accessCode: string;
	isAccessCodeEnabled: boolean;
	regenerateAccessCode: () => void;
	toggleAccessCode: () => void;
}

export const AccessCodeSection = ({
	accessCode,
	isAccessCodeEnabled,
	regenerateAccessCode,
	toggleAccessCode
}: AccessCodeSectionProps): React.JSX.Element => {
	const [t] = useTranslation();

	const [isAccessCodeShown, setIsAccessCodeShown] = useState(false);

	const createSnackbar = useSnackbar();

	const copyAccessCode = useCallback(() => {
		copyToClipboard(accessCode).then(() => {
			createSnackbar({
				key: new Date().toLocaleString(),
				severity: 'info',
				label: t('snackbar.clipboard.accessCodeCopied', 'Access code copied'),
				replace: true,
				hideButton: true
			});
		});
	}, [createSnackbar, accessCode, t]);

	const toggleShowAccessCode = useCallback(() => {
		setIsAccessCodeShown((prevState) => !prevState);
	}, []);

	const CustomElement = useMemo(
		() =>
			function IconComponent() {
				return (
					<Icon
						size={'large'}
						style={{ cursor: 'pointer' }}
						icon={isAccessCodeShown ? 'EyeOutline' : 'EyeOffOutline'}
						onClick={toggleShowAccessCode}
					/>
				);
			},
		[isAccessCodeShown, toggleShowAccessCode]
	);

	return (
		<Container mainAlignment="flex-start" crossAlignment="flex-start">
			<Switch
				value={isAccessCodeEnabled}
				padding={{ top: 'small' }}
				label={t('publicLink.accessCode.switch.label', 'Enable access code')}
				onClick={toggleAccessCode}
			/>
			{isAccessCodeEnabled && (
				<Container orientation={'horizontal'} padding={{ top: 'small' }} gap={'0.3rem'}>
					<Input
						type={isAccessCodeShown ? 'text' : 'password'}
						label={t('publicLink.accessCode.input.label', 'Access code')}
						value={accessCode}
						disabled
						CustomIcon={CustomElement}
					/>
					<Tooltip label={t('publicLink.accessCode.buttons.copy.tooltip', 'Copy access code')}>
						<Button onClick={copyAccessCode} icon={'Copy'} type={'outlined'} size={'extralarge'} />
					</Tooltip>
					<Tooltip
						label={t(
							'publicLink.accessCode.buttons.regenerate.tooltip',
							'Generate new access code'
						)}
					>
						<Button
							onClick={regenerateAccessCode}
							icon={'Refresh'}
							type={'outlined'}
							size={'extralarge'}
						/>
					</Tooltip>
				</Container>
			)}
		</Container>
	);
};
