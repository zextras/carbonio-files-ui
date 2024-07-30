/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Route } from 'react-router-dom';

import { DisplayerProps } from './components/Displayer';
import FilterView from './FilterView';
import { FILTER_TYPE, INTERNAL_PATH } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateNodes } from '../mocks/mockUtils';
import { screen, setup } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockFindNodes } from '../utils/resolverMocks';

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="displayer-test-id">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('View Mode', () => {
	it.each(Object.values(FILTER_TYPE))(
		'should switch between list view and grid view in filter %s',
		async (filter) => {
			const nodes = populateNodes();
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${filter}`],
				mocks
			});

			await screen.findByText(nodes[0].name);
			const gridModeIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode });
			expect(gridModeIcon).toBeVisible();
			expect(screen.getByTestId(SELECTORS.mainList)).toBeVisible();
			await user.click(gridModeIcon);
			const listModeIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.listViewMode });
			expect(listModeIcon).toBeVisible();
			expect(screen.getByTestId(SELECTORS.mainGrid)).toBeVisible();
			await user.click(listModeIcon);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode })).toBeVisible();
			expect(screen.getByTestId(SELECTORS.mainList)).toBeVisible();
		}
	);
});
