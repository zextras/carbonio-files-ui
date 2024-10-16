/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { act } from '@testing-library/react';

import useSelection from './useSelection';
import { populateFolder } from '../mocks/mockUtils';
import { setupHook } from '../tests/utils';
import { Node } from '../types/graphql/types';

describe('useSelection tests', () => {
	it('selectAll unSelectAll tests', () => {
		const nodes: Node[] = [];

		for (let i = 0; i < 10; i += 1) {
			nodes.push(populateFolder());
		}
		const { result } = setupHook(() => useSelection(nodes));

		expect(result.current.selectedIDs.length).toBe(0);
		expect(result.current.isSelectionModeActive).toBeFalsy();

		act(() => {
			result.current.selectAll();
		});

		expect(result.current.selectedIDs.length).toBe(10);
		expect(result.current.isSelectionModeActive).toBeTruthy();

		act(() => {
			result.current.unSelectAll();
		});

		expect(result.current.selectedIDs.length).toBe(0);
		expect(result.current.isSelectionModeActive).toBeTruthy();

		act(() => {
			result.current.selectAll();
		});

		expect(result.current.selectedIDs.length).toBe(10);
		expect(result.current.isSelectionModeActive).toBeTruthy();

		act(() => {
			result.current.exitSelectionMode();
		});

		expect(result.current.selectedIDs.length).toBe(0);
		expect(result.current.isSelectionModeActive).toBeFalsy();
	});

	it('selectId tests', () => {
		const nodes: Node[] = [];

		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < 10; i++) {
			nodes.push(populateFolder());
		}
		const getOne = nodes[0];
		const { result } = setupHook(() => useSelection(nodes));

		expect(result.current.selectedIDs.length).toBe(0);
		expect(result.current.isSelectionModeActive).toBeFalsy();

		act(() => {
			result.current.selectId(getOne.id);
		});

		expect(result.current.selectedIDs.length).toBe(1);
		expect(result.current.isSelectionModeActive).toBeTruthy();
		expect(result.current.selectedMap[getOne.id]).toBeTruthy();

		act(() => {
			result.current.selectId(getOne.id);
		});

		expect(result.current.selectedIDs.length).toBe(0);
		expect(result.current.isSelectionModeActive).toBeTruthy();
		expect(result.current.selectedMap[getOne.id]).toBeFalsy();

		act(() => {
			result.current.exitSelectionMode();
		});

		expect(result.current.isSelectionModeActive).toBeFalsy();
	});
});
