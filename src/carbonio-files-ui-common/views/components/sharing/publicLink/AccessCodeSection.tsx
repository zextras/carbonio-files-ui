/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useImperativeHandle, useMemo, useState } from 'react';

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

import { copyToClipboard, generateAccessCode } from '../../../../utils/utils';

export type AccessCodeInfo = { accessCode: string; isAccessCodeEnabled: boolean };

interface AccessCodeSectionProps {
	initialAccessCode: string;
	initialIsAccessCodeShown: boolean;
	accessCodeRef: React.Ref<AccessCodeInfo>;
}

export const AccessCodeSection = ({
	accessCodeRef,
	initialAccessCode,
	initialIsAccessCodeShown
}: AccessCodeSectionProps): React.JSX.Element => {
	const [t] = useTranslation();
	const [isAccessCodeEnabled, setIsAccessCodeEnabled] = useState(false);
	const [isAccessCodeShown, setIsAccessCodeShown] = useState(initialIsAccessCodeShown);
	const [accessCode, setAccessCode] = useState(initialAccessCode);

	const createSnackbar = useSnackbar();

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

	const toggleAccessCode = useCallback(() => {
		setIsAccessCodeEnabled((prevState) => !prevState);
	}, []);

	const regenerateAccessCode = useCallback(() => {
		setAccessCode(generateAccessCode());
	}, []);

	useImperativeHandle(
		accessCodeRef,
		() => ({
			accessCode,
			isAccessCodeEnabled
		}),
		[accessCode, isAccessCodeEnabled]
	);

	return (
		<Container mainAlignment="flex-start" crossAlignment="flex-start">
			<Switch
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
