/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { isEqual } from 'lodash';

import { selectionModeVar } from '../../apollo/selectionVar';
import { useMemoCompare } from '../../hooks/useMemoCompare';

function filterSelectedIDs(selectedIDs: string[], items: { id: string }[]): string[] {
	return selectedIDs.filter((selectedId) => items.some((item) => item.id === selectedId));
}

interface SelectionContextType {
	selectedIDs: string[];
	selectedMap: { [id: string]: boolean };
	selectId: (id: string) => void;
	isSelectionModeActive: boolean;
	unSelectAll: () => void;
	selectAll: () => void;
	exitSelectionMode: () => void;
	selectedCount: number;
	isAllSelected: boolean;
}

export function useSelection(items: Array<{ id: string }>): SelectionContextType {
	const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
	const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
	const selectionModeActive = useReactiveVar(selectionModeVar);

	useEffect(() => {
		if (!selectionModeActive) {
			setSelectedIDs([]);
			setIsSelectionModeActive(false);
		}
	}, [selectionModeActive]);

	const memoItems = useMemoCompare(items, (prev, next) => {
		const prevMap = prev?.map((item) => item.id);
		const nextMap = next.map((item) => item.id);
		return isEqual(prevMap, nextMap);
	});

	useEffect(() => {
		setSelectedIDs((prevState) => filterSelectedIDs(prevState, memoItems));
	}, [memoItems]);

	const selectedMap = useMemo(
		() =>
			memoItems.reduce<{ [id: string]: boolean }>((accumulator, item) => {
				accumulator[item.id] = selectedIDs.includes(item.id);
				return accumulator;
			}, {}),
		[memoItems, selectedIDs]
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
		const allSelected: string[] = memoItems.map((item) => item.id);
		setSelectedIDs(allSelected);
		setIsSelectionModeActive(true);
		selectionModeVar(true);
	}, [memoItems]);

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
		exitSelectionMode,
		selectedCount: selectedIDs.length,
		isAllSelected: selectedIDs.length === memoItems.length
	};
}

export const SelectionContext = createContext<SelectionContextType | null>(null);

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
		exitSelectionMode,
		selectedCount,
		isAllSelected
	} = useSelection(items);

	const providerValue = useMemo(
		() => ({
			selectedIDs,
			selectedMap,
			selectId,
			selectAll,
			unSelectAll,
			isSelectionModeActive,
			exitSelectionMode,
			selectedCount,
			isAllSelected
		}),
		[
			exitSelectionMode,
			isAllSelected,
			isSelectionModeActive,
			selectAll,
			selectId,
			selectedCount,
			selectedIDs,
			selectedMap,
			unSelectAll
		]
	);

	return <SelectionContext.Provider value={providerValue}>{children}</SelectionContext.Provider>;
};

export function useSelectionContext(): SelectionContextType {
	const context = useContext(SelectionContext);
	if (!context) {
		throw new Error('useSelectionContext must be used within a SelectionProvider');
	}
	return context;
}
