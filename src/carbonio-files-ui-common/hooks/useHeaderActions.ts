/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback } from 'react';

import { HeaderAction } from '@zextras/carbonio-ui-preview/lib/preview/Header';
import { useTranslation } from 'react-i18next';

import { useHealthInfo } from './useHealthInfo';
import { useOpenWithDocs } from './useOpenWithDocs';
import { useActiveNode } from '../../hooks/useActiveNode';
import { DISPLAYER_TABS } from '../constants';
import { File } from '../types/graphql/types';
import { canEdit, canOpenWithDocs } from '../utils/ActionsFactory';
import { downloadNode } from '../utils/utils';

export function useHeaderActions(): (node: File) => Array<HeaderAction> {
	const [t] = useTranslation();
	const openNodeWithDocs = useOpenWithDocs();
	const { setActiveNode } = useActiveNode();
	const { canUseDocs } = useHealthInfo();

	return useCallback(
		(node) => {
			const actions: Array<HeaderAction> = [
				{
					icon: 'ShareOutline',
					id: 'ShareOutline',
					tooltipLabel: t('preview.actions.tooltip.manageShares', 'Manage shares'),
					onClick: (): void => setActiveNode(node.id, DISPLAYER_TABS.sharing)
				},
				{
					icon: 'DownloadOutline',
					tooltipLabel: t('preview.actions.tooltip.download', 'Download'),
					id: 'DownloadOutline',
					onClick: (): void => downloadNode(node.id)
				}
			];
			if (canEdit({ nodes: [node], canUseDocs })) {
				actions.unshift({
					icon: 'Edit2Outline',
					id: 'Edit',
					onClick: (): Promise<void> => openNodeWithDocs(node.id),
					tooltipLabel: t('preview.actions.tooltip.edit', 'Edit')
				});
			} else if (canOpenWithDocs({ nodes: [node], canUseDocs })) {
				actions.unshift({
					id: 'OpenWithDocs',
					icon: 'BookOpenOutline',
					tooltipLabel: t('actions.openWithDocs', 'Open document'),
					onClick: (): Promise<void> => openNodeWithDocs(node.id)
				});
			}
			return actions;
		},
		[canUseDocs, openNodeWithDocs, setActiveNode, t]
	);
}
