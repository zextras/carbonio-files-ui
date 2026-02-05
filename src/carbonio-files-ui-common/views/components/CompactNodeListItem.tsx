/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { Button, Container, Row, Text, Tooltip, useTheme } from '@zextras/carbonio-design-system';
import { some } from 'lodash';
import { useTranslation } from 'react-i18next';

import { NodeAvatarIcon } from './NodeAvatarIcon';
import { HoverContainer, ListItemContainer } from './StyledComponents';
import { LIST_ITEM_AVATAR_HEIGHT, LIST_ITEM_HEIGHT_COMPACT, ROOTS } from '../../constants';
import { File, Folder, Node as GQLNode, NodeType } from '../../types/graphql/types';
import {
	getIconByFileType,
	cssCalcBuilder,
	getIconColorByFileType,
	isFile
} from '../../utils/utils';

type NodeItem = Pick<GQLNode, 'id' | 'name' | 'type'> &
	(Pick<File, '__typename' | 'mime_type'> | Pick<Folder, '__typename'> | { __typename?: never });

export interface CompactNodeListItemProps<TNode extends NodeItem = NodeItem> {
	node: TNode;
	isActive?: boolean;
	setActive?: (node: TNode, event: React.SyntheticEvent) => void;
	navigateTo?: (id: string, event?: React.SyntheticEvent | Event) => void;
	disabled?: boolean;
	selectable?: boolean;
	trashed?: boolean;
}

export const CompactNodeListItem = <TNode extends NodeItem = NodeItem>({
	node,
	isActive,
	setActive = (): void => undefined,
	navigateTo = (): void => undefined,
	disabled = false,
	selectable = true,
	trashed
}: CompactNodeListItemProps<TNode>): React.JSX.Element => {
	const [t] = useTranslation();
	const theme = useTheme();

	const isNavigable = useMemo(
		() =>
			node.type === NodeType.Folder ||
			node.type === NodeType.Root ||
			some(ROOTS, (rootId) => rootId === node.id),
		[node.id, node.type]
	);

	const openNode = useCallback(
		(event: React.SyntheticEvent | KeyboardEvent) => {
			// remove text selection on double click
			if (window.getSelection) {
				const selection = window.getSelection();
				selection?.removeAllRanges();
			}

			if (!disabled && !trashed && isNavigable) {
				navigateTo(node.id, event);
			}
		},
		[disabled, trashed, isNavigable, navigateTo, node.id]
	);

	const setActiveNode = useCallback(
		(event: React.SyntheticEvent) => {
			setActive(node, event);
		},
		[setActive, node]
	);

	const doubleClickHandler = useCallback(
		(event: React.SyntheticEvent) => {
			openNode(event);
		},
		[openNode]
	);

	const preventTextSelection = useCallback<React.MouseEventHandler>((e: React.MouseEvent): void => {
		if (e.detail > 1) {
			e.preventDefault();
		}
	}, []);

	const mimeType = useMemo(() => (isFile(node) && node.mime_type) || undefined, [node]);

	return (
		<Container data-testid={node.id}>
			<ListItemContainer
				height={'fit'}
				onClick={setActiveNode}
				onDoubleClick={doubleClickHandler}
				data-testid={`node-item-${node.id}`}
				crossAlignment={'flex-end'}
				$contextualMenuActive={false}
				$disableHover={disabled}
				$disabled={disabled}
				onMouseDown={preventTextSelection}
			>
				<HoverContainer
					height={LIST_ITEM_HEIGHT_COMPACT}
					wrap="nowrap"
					mainAlignment="flex-start"
					crossAlignment="center"
					padding={{ all: 'small' }}
					width="fill"
					background={isActive ? 'highlight' : 'gray6'}
					data-testid={'hover-container'}
				>
					<Container orientation="horizontal" minWidth="0" width="fill">
						<NodeAvatarIcon
							selectionModeActive={false}
							selected={false}
							compact
							disabled={disabled}
							selectable={selectable}
							icon={getIconByFileType(node.type, mimeType ?? node.id)}
							color={getIconColorByFileType(node.type, mimeType ?? node.id, theme)}
						/>
						<Container
							orientation="vertical"
							crossAlignment="flex-start"
							mainAlignment="space-around"
							padding={{ left: 'large' }}
							minWidth="auto"
							width="fill"
							maxWidth={cssCalcBuilder('100%', ['-', LIST_ITEM_AVATAR_HEIGHT])}
						>
							<Row
								padding={{ vertical: 'extrasmall' }}
								width="fill"
								wrap="nowrap"
								mainAlignment="space-between"
							>
								<Text overflow="ellipsis" disabled={disabled} size="medium">
									{node.name}
								</Text>
							</Row>
						</Container>
					</Container>
					{isNavigable && !trashed && (
						<Tooltip
							label={t('actions.viewContents', 'View contents')}
							placement="top"
							disabled={disabled}
						>
							<Button
								icon="ChevronRight"
								onClick={openNode}
								type="ghost"
								size="large"
								color={'gray0'}
								disabled={disabled}
							/>
						</Tooltip>
					)}
				</HoverContainer>
			</ListItemContainer>
		</Container>
	);
};
