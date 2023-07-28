/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { map } from 'lodash';

import ListHeader from '../../../components/ListHeader';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateParents } from '../../mocks/mockUtils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { Folder } from '../../types/graphql/types';
import { mockGetPath } from '../../utils/resolverMocks';
import { buildBreadCrumbRegExp, setup } from '../../utils/testUtils';

describe('ListHeader', () => {
	describe('Breadcrumb', () => {
		test('show only current folder if it has not a parent', async () => {
			const currentFolder = populateFolder();
			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;

			const selectAll = jest.fn();
			const unSelectAll = jest.fn();
			const exitSelectionMode = jest.fn();
			const { getByTextWithMarkup } = setup(
				<ListHeader
					folderId={currentFolder.id}
					exitSelectionMode={exitSelectionMode}
					isAllSelected={false}
					isSelectionModeActive={false}
					permittedSelectionModeActionsItems={[]}
					selectAll={selectAll}
					unSelectAll={unSelectAll}
				/>,
				{ mocks }
			);

			await screen.findByText((content) => content.includes(currentFolder.name));

			const breadcrumbRegExp = buildBreadCrumbRegExp(currentFolder.name);
			expect(getByTextWithMarkup(breadcrumbRegExp)).toBeVisible();
		});

		test('by default shows two level (current folder and its parent)', async () => {
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				}
			} satisfies Partial<Resolvers>;

			const selectAll = jest.fn();
			const unSelectAll = jest.fn();
			const exitSelectionMode = jest.fn();
			const { getByTextWithMarkup } = setup(
				<ListHeader
					folderId={currentFolder.id}
					exitSelectionMode={exitSelectionMode}
					isAllSelected={false}
					isSelectionModeActive={false}
					permittedSelectionModeActionsItems={[]}
					selectAll={selectAll}
					unSelectAll={unSelectAll}
				/>,
				{ mocks }
			);

			await screen.findByText((currentFolder.parent as Folder).name);

			const breadcrumbRegExp = buildBreadCrumbRegExp(
				(currentFolder.parent as Folder).name,
				currentFolder.name
			);
			expect(getByTextWithMarkup(breadcrumbRegExp)).toBeVisible();
		});

		test('consecutive clicks on the cta expand and collapse the path with a single API request to retrieve the full path', async () => {
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			const mocks = {
				Query: {
					getPath: mockGetPath(path)
				}
			} satisfies Partial<Resolvers>;

			const selectAll = jest.fn();
			const unSelectAll = jest.fn();
			const exitSelectionMode = jest.fn();
			const { findByTextWithMarkup, getByTextWithMarkup, user } = setup(
				<ListHeader
					folderId={currentFolder.id}
					exitSelectionMode={exitSelectionMode}
					isAllSelected={false}
					isSelectionModeActive={false}
					permittedSelectionModeActionsItems={[]}
					selectAll={selectAll}
					unSelectAll={unSelectAll}
				/>,
				{ mocks }
			);

			const shortBreadcrumbRegExp = buildBreadCrumbRegExp(
				(currentFolder.parent as Folder).name,
				currentFolder.name
			);

			const fullBreadcrumbRegExp = buildBreadCrumbRegExp(...map(path, (node) => node.name));

			// wait for the breadcrumb to be loaded
			await findByTextWithMarkup(shortBreadcrumbRegExp);
			// by default only 2 levels are shown
			expect(getByTextWithMarkup(shortBreadcrumbRegExp)).toBeVisible();
			// user clicks on the cta
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			// wait for the full path to be loaded
			await screen.findByTestId(ICON_REGEXP.breadcrumbCtaReduce);
			await screen.findByText(/hide previous folders/i);
			// all levels are now shown
			expect(getByTextWithMarkup(fullBreadcrumbRegExp)).toBeVisible();
			// user clicks again on the cta
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			await screen.findByText(/show previous folders/i);
			// root element is not shown now, only the short breadcrumb, without a request to the API
			expect(getByTextWithMarkup(shortBreadcrumbRegExp)).toBeVisible();
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			// user clicks on the cta
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCta));
			// wait for the full path to be loaded
			await screen.findByTestId(ICON_REGEXP.breadcrumbCtaReduce);
			await screen.findByText(/hide previous folders/i);
			// all levels are now shown immediately without a request to the API
			expect(getByTextWithMarkup(fullBreadcrumbRegExp)).toBeVisible();
		});
	});
	describe('Select Badge Counter', () => {
		test('should render the badge with the number of selectedCount if the selectedCount is > 0', () => {
			const { node: currentFolder } = populateParents(populateFolder(), 5);

			const selectAll = jest.fn();
			const unselectAll = jest.fn();
			const exitSelectionMode = jest.fn();
			const selectedCount = 1;
			setup(
				<ListHeader
					folderId={currentFolder.id}
					isSelectionModeActive
					permittedSelectionModeActionsItems={[]}
					selectAll={selectAll}
					unSelectAll={unselectAll}
					exitSelectionMode={exitSelectionMode}
					isAllSelected={false}
					selectedCount={selectedCount}
				/>,
				{ mocks: {} }
			);
			expect(screen.getByTestId(SELECTORS.listHeaderSelectionMode)).toBeVisible();
			expect(screen.getByText(selectedCount)).toBeVisible();
		});
		test('Should not render the badge with 0 if selectedCount is 0', () => {
			const { node: currentFolder } = populateParents(populateFolder(), 5);

			const selectAll = jest.fn();
			const unselectAll = jest.fn();
			const exitSelectionMode = jest.fn();
			const selectedCount = 0;
			setup(
				<ListHeader
					folderId={currentFolder.id}
					isSelectionModeActive
					permittedSelectionModeActionsItems={[]}
					selectAll={selectAll}
					unSelectAll={unselectAll}
					exitSelectionMode={exitSelectionMode}
					isAllSelected={false}
					selectedCount={selectedCount}
				/>,
				{ mocks: {} }
			);
			expect(screen.queryByText(selectedCount)).not.toBeInTheDocument();
		});
	});
});
