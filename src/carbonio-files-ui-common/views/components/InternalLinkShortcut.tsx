/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback } from 'react';

import { Button, useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useInternalLink } from '../../../hooks/useInternalLink';
import { Node } from '../../types/common';
import { copyToClipboard } from '../../utils/utils';
import { HoverSwitchComponent } from './HoverSwitchComponent';

interface InternalLinkShortcutProps {
	id: Node['id'];
	type: Node['type'];
}

export const InternalLinkShortcut = ({ id, type }: InternalLinkShortcutProps): JSX.Element => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();

	const { internalLink } = useInternalLink(id, type);

	const copyShortcut = useCallback(() => {
		if (internalLink) {
			copyToClipboard(internalLink).then(() => {
				createSnackbar({
					key: new Date().toLocaleString(),
					type: 'info',
					label: t('snackbar.clipboard.itemShortcutCopied', 'Item shortcut copied'),
					replace: true,
					hideButton: true
				});
			});
		}
	}, [createSnackbar, internalLink, t]);

	return (
		<>
			{internalLink && (
				<HoverSwitchComponent
					visibleToHiddenComponent={
						<Button
							label={t('displayer.details.copyShortcut', "copy item's shortcut")}
							type="outlined"
							icon="CopyOutline"
							onClick={copyShortcut}
							shape="round"
						/>
					}
					hiddenToVisibleComponent={
						<Button
							label={t('displayer.details.copyShortcut', "copy item's shortcut")}
							type="outlined"
							icon="Copy"
							onClick={copyShortcut}
							shape="round"
						/>
					}
				/>
			)}
		</>
	);
};
