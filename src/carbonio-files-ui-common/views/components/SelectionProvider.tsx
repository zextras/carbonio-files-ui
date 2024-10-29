/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { map, find, filter, includes, isEqual } from 'lodash';

import { selectionModeVar } from '../../apollo/selectionVar';
import { useMemoCompare } from '../../hooks/useMemoCompare';

export function useSelection(nodes: Array<{ id: string }>): {
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
			memoNodes.reduce<{ [id: string]: boolean }>((accumulator, node) => {
				accumulator[node.id] = includes(selectedIDs, node.id);
				return accumulator;
			}, {}),
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
		const allSelected: string[] = memoNodes.map((node) => node.id);
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
export const SelectionContext = createContext<ReturnType<typeof useSelection>>({
	exitSelectionMode(): void {},
	isSelectionModeActive: false,
	selectAll(): void {},
	selectId(id: string): void {},
	selectedIDs: [],
	selectedMap: {},
	unSelectAll(): void {}
});

interface SelectionProviderProps {
	children: React.ReactNode;
	items: { id: string }[];
}

export const SelectionProvider = ({
	children,
	items
}: SelectionProviderProps): React.JSX.Element => {
	const {
		selectedIDs,
		selectedMap,
		selectId,
		selectAll,
		unSelectAll,
		isSelectionModeActive,
		exitSelectionMode
	} = useSelection(items);

	const providerValue = useMemo(
		() => ({
			selectedIDs,
			selectedMap,
			selectId,
			selectAll,
			unSelectAll,
			isSelectionModeActive,
			exitSelectionMode
		}),
		[
			exitSelectionMode,
			isSelectionModeActive,
			selectAll,
			selectId,
			selectedIDs,
			selectedMap,
			unSelectAll
		]
	);

	return <SelectionContext.Provider value={providerValue}>{children}</SelectionContext.Provider>;
};

export function useSelectionContext(): ReturnType<typeof useSelection> {
	return useContext(SelectionContext);
}
