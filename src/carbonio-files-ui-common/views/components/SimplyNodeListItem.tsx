/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { some, isEmpty } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'styled-components';

import { NodeAvatarIcon } from './NodeAvatarIcon';
import { NodeListItemUI } from './NodeListItemUI';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DATE_FORMAT_SHORT, ROOTS } from '../../constants';
import { NodeListItemType } from '../../types/common';
import {
	isFile,
	isSearchView,
	formatDate,
	getIconByFileType,
	getIconColorByFileType
} from '../../utils/utils';

interface NodeListItemProps {
	node: NodeListItemType;
}

export const SimplyNodeListItem: React.VFC<NodeListItemProps> = ({ node }) => {
	const { me, locale } = useUserInfo();

	const draggedItems = useReactiveVar(draggedItemsVar);

	const [dragging] = useMemo(
		() => [!isEmpty(draggedItems), !!draggedItems && some(draggedItems, ['id', node.id])],
		[draggedItems, node]
	);

	const {
		id,
		name,
		type,
		updated_at: updatedAt,
		owner,
		flagged: flagActive,
		last_editor: lastEditor
	} = node;
	const extension = useMemo(() => (isFile(node) && node.extension) || undefined, [node]);
	const mimeType = useMemo(() => (isFile(node) && node.mime_type) || undefined, [node]);
	const size = useMemo(() => (isFile(node) && node.size) || undefined, [node]);
	const trashed = useMemo(() => node.rootId === ROOTS.TRASH, [node.rootId]);
	const incomingShare = useMemo(() => me !== node.owner?.id, [me, node.owner?.id]);
	const outgoingShare = useMemo(
		() => me === node.owner?.id && node.shares && node.shares.length > 0,
		[me, node.owner?.id, node.shares]
	);

	const [t] = useTranslation();
	const location = useLocation();

	const theme = useTheme();

	const displayName = useMemo(() => {
		if (lastEditor && lastEditor.id !== owner?.id) {
			return lastEditor.full_name;
		}
		if (owner && owner.id !== me) {
			return owner.full_name;
		}
		return '';
	}, [lastEditor, owner, me]);

	return (
		<NodeListItemUI
			id={id}
			flagActive={flagActive}
			disabled={false}
			incomingShare={incomingShare}
			outgoingShare={outgoingShare}
			displayName={displayName}
			name={name}
			trashed={trashed && isSearchView(location)}
			updatedAt={formatDate(updatedAt, locale, DATE_FORMAT_SHORT)}
			extensionOrType={extension ?? t(`node.type.${type.toLowerCase()}`, type)}
			contextualMenuDisabled
			hoverContainerBackground={'gray6'}
			listItemContainerContextualMenuActive={false}
			listItemContainerDisableHover={dragging}
			nodeAvatarIcon={
				<NodeAvatarIcon
					selectionModeActive={false}
					selected={false}
					compact={false}
					disabled={false}
					icon={getIconByFileType(type, mimeType ?? id)}
					color={getIconColorByFileType(type, mimeType ?? id, theme)}
				/>
			}
			size={size}
		/>
	);
};
