/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { FieldFunctionOptions, Reference } from '@apollo/client';
import { keyBy } from 'lodash';

import { NodesListCachedObject } from '../../types/apollo';

export function mergeNodesList(
	existing: NodesListCachedObject | undefined,
	incoming: Reference[],
	{ readField, mergeObjects }: FieldFunctionOptions
): NodesListCachedObject {
	const newOrdered = keyBy(existing?.ordered, (item) => readField<string>('id', item) as string);
	const newUnOrdered = keyBy(
		existing?.unOrdered,
		(item) => readField<string>('id', item) as string
	);
	// add all incoming items
	// if an item was already loaded in existing ordered data it will be merged with the incoming one
	const unCachedOrdered: Reference[] = [];
	incoming.forEach((item: Reference) => {
		const id = readField<string>('id', item) as string;
		// if item is stored in cache id is valued
		if (id) {
			// check if item is stored inside the ordered nodes
			const cachedOrderedNode = newOrdered[id];
			if (cachedOrderedNode) {
				// if it is stored inside ordered nodes, merge existing data with incoming ones
				newOrdered[id] = mergeObjects(cachedOrderedNode, item);
			} else {
				// otherwise, add incoming data to the list of the uncached ordered nodes
				unCachedOrdered.push(item);
			}
			// unOrderItem that now is ordered
			if (newUnOrdered[id] != null) {
				// remove item from the unOrdered since it's now in the ordered list
				delete newUnOrdered[id];
			}
		} else {
			// item wasn't store in cache, so add it directly in the uncached ordered nodes
			unCachedOrdered.push(item);
		}
	});

	// finally, return an array again so that manual updates of the cache can work on the order of elements
	return {
		ordered: Object.values(newOrdered).concat(...unCachedOrdered),
		unOrdered: Object.values(newUnOrdered)
	};
}

export function readNodesList(existing: NodesListCachedObject): Reference[] {
	const ordered = existing.ordered || [];
	const unOrdered = existing.unOrdered || [];
	return [...ordered, ...unOrdered];
}
