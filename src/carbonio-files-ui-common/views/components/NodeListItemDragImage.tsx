/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'styled-components';

import { NodeAvatarIcon } from './NodeAvatarIcon';
import { NodeListItemUI } from './NodeListItemUI';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { DATE_FORMAT_SHORT } from '../../constants';
import { NodeListItemType } from '../../types/common';
import {
	formatDate,
	getIconByFileType,
	getIconColorByFileType,
	isFile,
	isSearchView,
	nodeToNodeListItemUIProps
} from '../../utils/utils';

export const NodeListItemDragImage = ({ node }: { node: NodeListItemType }): React.JSX.Element => {
	const { me, locale } = useUserInfo();

	const [t] = useTranslation();
	const location = useLocation();

	const theme = useTheme();
	const mimeType = (isFile(node) && node.mime_type) || undefined;
	const props = nodeToNodeListItemUIProps(node, t, me);

	return (
		<NodeListItemUI
			{...props}
			disabled={false}
			trashed={props.trashed && isSearchView(location)}
			updatedAt={formatDate(node.updated_at, locale, DATE_FORMAT_SHORT)}
			contextualMenuDisabled
			hoverContainerBackground={'gray6'}
			listItemContainerContextualMenuActive={false}
			listItemContainerDisableHover
			nodeAvatarIcon={
				<NodeAvatarIcon
					selectionModeActive={false}
					selected={false}
					compact={false}
					disabled={false}
					icon={getIconByFileType(node.type, mimeType ?? node.id)}
					color={getIconColorByFileType(node.type, mimeType ?? node.id, theme)}
				/>
			}
		/>
	);
};
