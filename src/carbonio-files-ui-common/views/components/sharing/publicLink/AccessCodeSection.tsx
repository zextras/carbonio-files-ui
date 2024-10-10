/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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

export const AccessCodeSection = (): React.JSX.Element => {
	const [t] = useTranslation();
	const [isAccessCodeEnabled, setIsAccessCodeEnabled] = useState<boolean>(false);
	const [isAccessCodeShown, setIsAccessCodeShown] = useState<boolean>(false);
	const [accessCode, setAccessCode] = useState<string>();

	useEffect(() => {
		setAccessCode(generateAccessCode());
	}, []);

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

	return (
		<Container mainAlignment="flex-start" crossAlignment="flex-start">
			<Switch
				padding={{ top: 'small' }}
				label={t('publicLink.switch.label', 'Enable access code')}
				onClick={toggleAccessCode}
			/>
			{isAccessCodeEnabled && (
				<Container orientation={'horizontal'} padding={{ top: 'small' }} gap={'0.3rem'}>
					<Input
						type={isAccessCodeShown ? 'text' : 'password'}
						label={t('publicLink.inputAccessCode.label', 'Access code')}
						value={accessCode}
						disabled
						CustomIcon={CustomElement}
					/>
					<Tooltip label={'Copy access code'}>
						<Button onClick={copyAccessCode} icon={'Copy'} type={'outlined'} size={'extralarge'} />
					</Tooltip>
					<Tooltip label={'Generate new access code'}>
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
