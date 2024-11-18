/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { makeVar } from '@apollo/client';

import { Node } from '../types/common';
import { DeepPick } from '../types/utils';

export type DraggedItem = Node<'id' | 'permissions' | 'rootId'> &
	DeepPick<Node<'parent'>, 'parent', 'id' | 'permissions' | '__typename'> &
	DeepPick<Node<'owner'>, 'owner', 'id'>;

declare global {
	interface Window {
		draggedItem?: DraggedItem[];
	}
}

export const draggedItemsVar = makeVar<DraggedItem[] | null>(null);
