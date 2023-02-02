/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ApolloError } from '@apollo/client';
import { screen } from '@testing-library/react';
import { map } from 'lodash';

import ListHeader from '../../../components/ListHeader';
import { populateFolder, populateParents } from '../../mocks/mockUtils';
import { Folder } from '../../types/graphql/types';
import { mockGetParent, mockGetPath } from '../../utils/mockUtils';
import { buildBreadCrumbRegExp, generateError, setup } from '../../utils/testUtils';
import { buildCrumbs } from '../../utils/utils';

describe('ListHeader', () => {
	describe('Breadcrumb', () => {
		test('show only current folder if it has not a parent', async () => {
			const currentFolder = populateFolder();
			const mocks = [mockGetParent({ node_id: currentFolder.id }, currentFolder)];

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
			const { node: currentFolder } = populateParents(populateFolder(), 5);
			const mocks = [mockGetParent({ node_id: currentFolder.id }, currentFolder)];

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

			const breadcrumbRegExp = buildBreadCrumbRegExp(
				(currentFolder.parent as Folder).name,
				currentFolder.name
			);
			expect(getByTextWithMarkup(breadcrumbRegExp)).toBeVisible();
		});

		test('consecutive clicks on the cta expand and collapse the path with a single API request to retrieve the full path', async () => {
			const { node: currentFolder, path } = populateParents(populateFolder(), 5);
			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				mockGetPath({ node_id: currentFolder.id }, path)
			];

			const selectAll = jest.fn();
			const unSelectAll = jest.fn();
			const exitSelectionMode = jest.fn();
			const { getByTextWithMarkup, user } = setup(
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
			await screen.findByText((content) => content.includes(currentFolder.name));
			// by default only 2 levels are shown
			expect(getByTextWithMarkup(shortBreadcrumbRegExp)).toBeVisible();
			// user clicks on the cta
			await user.click(screen.getByTestId('icon: FolderOutline'));
			// wait for the full path to be loaded
			await screen.findByTestId('icon: ChevronLeft');
			await screen.findByText(/hide previous folders/i);
			// all levels are now shown
			expect(getByTextWithMarkup(fullBreadcrumbRegExp)).toBeVisible();
			// user clicks again on the cta
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByText(/show previous folders/i);
			// root element is not shown now, only the short breadcrumb, without a request to the API
			expect(getByTextWithMarkup(shortBreadcrumbRegExp)).toBeVisible();
			expect(screen.queryByText(path[0].name)).not.toBeInTheDocument();
			// user clicks on the cta
			await user.click(screen.getByTestId('icon: FolderOutline'));
			// wait for the full path to be loaded
			await screen.findByTestId('icon: ChevronLeft');
			await screen.findByText(/hide previous folders/i);
			// all levels are now shown immediately without a request to the API
			expect(getByTextWithMarkup(fullBreadcrumbRegExp)).toBeVisible();
		});

		test('if an error occurs when loading full breadcrumb, short breadcrumb stays visible', async () => {
			const { node: currentFolder } = populateParents(populateFolder(), 5);
			const mocks = [
				mockGetParent({ node_id: currentFolder.id }, currentFolder),
				{
					request: mockGetPath({ node_id: currentFolder.id }, []).request,
					error: new ApolloError({ graphQLErrors: [generateError('Failed to load getPath')] })
				}
			];

			const selectAll = jest.fn();
			const unselectAll = jest.fn();
			const exitSelectionMode = jest.fn();
			const { getByTextWithMarkup, user } = setup(
				<ListHeader
					folderId={currentFolder.id}
					isSelectionModeActive={false}
					permittedSelectionModeActionsItems={[]}
					selectAll={selectAll}
					unSelectAll={unselectAll}
					exitSelectionMode={exitSelectionMode}
					isAllSelected={false}
				/>,
				{ mocks }
			);

			const shortBreadcrumbRegExp = buildBreadCrumbRegExp(
				(currentFolder.parent as Folder).name,
				currentFolder.name
			);
			const crumbs = buildCrumbs(currentFolder);

			// wait for the breadcrumb to be loaded
			await screen.findByText((content) => content.includes(currentFolder.name));
			// by default only 2 levels are shown
			expect(getByTextWithMarkup(shortBreadcrumbRegExp)).toBeVisible();
			// user clicks on the cta
			await user.click(screen.getByTestId('icon: FolderOutline'));
			// wait for response
			await screen.findByText(/show previous folders/i);
			// root element is not shown but the short breadcrumb remains visible
			expect(getByTextWithMarkup(shortBreadcrumbRegExp)).toBeVisible();
			expect(screen.queryByText(crumbs[0].label)).not.toBeInTheDocument();
		});
	});
});
