/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { Container, Row, Text } from '@zextras/carbonio-design-system';
import { some, debounce } from 'lodash';
import { useTheme } from 'styled-components';

import { NodeAvatarIcon } from './NodeAvatarIcon';
import { HoverContainer, ListItemContainer } from './StyledComponents';
import {
	DOUBLE_CLICK_DELAY,
	LIST_ITEM_AVATAR_HEIGHT,
	LIST_ITEM_HEIGHT_COMPACT,
	ROOTS
} from '../../constants';
import { useHealthInfo } from '../../hooks/useHealthInfo';
import { NodeListItemType } from '../../types/common';
import { NodeType } from '../../types/graphql/types';
import { getPreviewOutputFormat, getPreviewThumbnailSrc } from '../../utils/previewUtils';
import {
	getIconByFileType,
	cssCalcBuilder,
	getIconColorByFileType,
	isFile
} from '../../utils/utils';

interface CompactNodeListItemProps {
	node: NodeListItemType;
	isActive?: boolean;
	setActive?: (node: NodeListItemType, event: React.SyntheticEvent) => void;
	navigateTo?: (id: string, event?: React.SyntheticEvent | Event) => void;
	disabled?: boolean;
	selectable?: boolean;
	trashed?: boolean;
	version?: number;
}

export const CompactNodeListItem = ({
	node,
	isActive,
	setActive = (): void => undefined,
	navigateTo = (): void => undefined,
	disabled = false,
	selectable = true,
	trashed,
	version
}: CompactNodeListItemProps): React.JSX.Element => {
	const theme = useTheme();

	const isNavigable = useMemo(
		() =>
			node.type === NodeType.Folder ||
			node.type === NodeType.Root ||
			some(ROOTS, (rootId) => rootId === node.id),
		[node.id, node.type]
	);
	const { canUsePreview } = useHealthInfo();

	const openNode = useCallback(
		(event: React.SyntheticEvent | KeyboardEvent) => {
			// remove text selection on double click
			if (window.getSelection) {
				const selection = window.getSelection();
				selection && selection.removeAllRanges();
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

	const setActiveDebounced = useMemo(
		() =>
			debounce(
				(event: React.SyntheticEvent) => {
					setActiveNode(event);
				},
				DOUBLE_CLICK_DELAY,
				{ leading: false, trailing: true }
			),
		[setActiveNode]
	);

	const doubleClickHandler = useCallback(
		(event: React.SyntheticEvent) => {
			setActiveDebounced.cancel();
			openNode(event);
		},
		[openNode, setActiveDebounced]
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
				>
					<NodeAvatarIcon
						selectionModeActive={false}
						selected={false}
						compact
						disabled={disabled}
						selectable={selectable}
						icon={getIconByFileType(node.type, mimeType ?? node.id)}
						color={getIconColorByFileType(node.type, mimeType ?? node.id, theme)}
						picture={
							canUsePreview
								? getPreviewThumbnailSrc(
										node.id,
										version,
										node.type,
										mimeType,
										{ width: 80, height: 80, outputFormat: getPreviewOutputFormat(mimeType) },
										'thumbnail'
									)
								: undefined
						}
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
				</HoverContainer>
			</ListItemContainer>
		</Container>
	);
};
