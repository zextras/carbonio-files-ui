/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ViewModeComponent } from './ViewModeComponent';
import { viewModeVar } from '../../apollo/viewModeVar';
import { VIEW_MODE } from '../../constants';
import { ICON_REGEXP } from '../../constants/test';
import { setup, screen } from '../../tests/utils';

describe('ViewModeComponent', () => {
	it('should show the grid icon as default', () => {
		setup(<ViewModeComponent />);
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode })).toBeVisible();
	});
	it('should show the list icon when the current view mode value is grid', () => {
		viewModeVar(VIEW_MODE.grid);
		setup(<ViewModeComponent />);
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.listViewMode })).toBeVisible();
	});
	it('should show the grid icon when the current view mode value is list', () => {
		viewModeVar(VIEW_MODE.list);
		setup(<ViewModeComponent />);
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode })).toBeVisible();
	});
	it('should toggle the view mode when click on icon', async () => {
		const { user } = setup(<ViewModeComponent />);
		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode }));
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.listViewMode })).toBeVisible();
		expect(viewModeVar()).toBe(VIEW_MODE.grid);
		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.listViewMode }));
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode })).toBeVisible();
		expect(viewModeVar()).toBe(VIEW_MODE.list);
	});
});
