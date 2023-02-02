/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { map, find, filter, includes, isEqual, reduce } from 'lodash';

import { selectionModeVar } from '../apollo/selectionVar';
import { PickIdNodeType } from '../types/common';
import { useMemoCompare } from './useMemoCompare';

export default function useSelection(nodes: Array<PickIdNodeType>): {
	selectedIDs: string[];
	selectedMap: { [id: string]: boolean };
	selectId: (id: string) => void;
	isSelectionModeActive: boolean;
	unSelectAll: () => void;
	selectAll: () => void;
	exitSelectionMode: () => void;
} {
	const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
	const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
	const selectionModeActive = useReactiveVar(selectionModeVar);

	useEffect(() => {
		if (!selectionModeActive) {
			setSelectedIDs([]);
			setIsSelectionModeActive(false);
		}
	}, [selectionModeActive]);

	const memoNodes = useMemoCompare(nodes, (prev, next) => {
		const prevMap = map(prev, (item) => item.id);
		const nextMap = map(next, (item) => item.id);
		return isEqual(prevMap, nextMap);
	});

	useEffect(() => {
		setSelectedIDs((prevState) =>
			filter(prevState, (selectedId) => find(memoNodes, ['id', selectedId]) !== undefined)
		);
	}, [memoNodes]);

	const selectedMap = useMemo(
		() =>
			reduce(
				memoNodes,
				(accumulator: { [id: string]: boolean }, node: PickIdNodeType) => {
					accumulator[node.id] = includes(selectedIDs, node.id);
					return accumulator;
				},
				{}
			),
		[memoNodes, selectedIDs]
	);

	const selectId = useCallback((id: string) => {
		setSelectedIDs((prevState) => {
			const previousIds = [...prevState];
			const index = previousIds.indexOf(id);
			if (index > -1) {
				previousIds.splice(index, 1);
			} else {
				previousIds.push(id);
			}
			return previousIds;
		});
		setIsSelectionModeActive(true);
		selectionModeVar(true);
	}, []);

	const unSelectAll = useCallback(() => {
		setSelectedIDs([]);
	}, []);

	const selectAll = useCallback(() => {
		const allSelected: string[] = map(memoNodes, (node: PickIdNodeType) => node.id);
		setSelectedIDs(allSelected);
		setIsSelectionModeActive(true);
		selectionModeVar(true);
	}, [memoNodes]);

	const exitSelectionMode = useCallback(() => {
		selectionModeVar(false);
	}, []);

	return {
		selectedIDs,
		selectedMap,
		selectId,
		isSelectionModeActive,
		unSelectAll,
		selectAll,
		exitSelectionMode
	};
}
