/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';
import { keyBy } from 'lodash';
import { act } from 'react-dom/test-utils';
import { Link, Switch, Route } from 'react-router-dom';

import { uploadVar } from './carbonio-files-ui-common/apollo/uploadVar';
import { FILES_ROUTE } from './carbonio-files-ui-common/constants';
import { populateUploadItems } from './carbonio-files-ui-common/mocks/mockUtils';
import { UploadStatus } from './carbonio-files-ui-common/types/graphql/client-types';
import { setup } from './carbonio-files-ui-common/utils/testUtils';
import { UseNavigationHook } from './hooks/useNavigation';
import { PrimaryBarElement } from './PrimaryBarElement';

let mockedUseNavigationHook: ReturnType<UseNavigationHook>;

jest.mock('', () => ({
	useNavigation: (): ReturnType<UseNavigationHook> => mockedUseNavigationHook
}));

mockedUseNavigationHook = {
	navigateTo: jest.fn(),
	navigateToFolder: jest.fn(),
	navigateBack: jest.fn
};

describe('PrimaryBarElement', () => {
	test('should render an alert icon if an upload fails', () => {
		const uploadItems = populateUploadItems(2);
		uploadItems[0].status = UploadStatus.FAILED;
		uploadItems[1].status = UploadStatus.COMPLETED;
		uploadVar(keyBy(uploadItems, (item) => item.id));
		setup(<PrimaryBarElement active />);
		expect(screen.getByTestId('icon: AlertCircle')).toBeVisible();
		act(() => {
			uploadVar({
				...uploadVar(),
				[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
			});
		});
		expect(screen.queryByTestId('icon: AlertCircle')).not.toBeInTheDocument();
	});
	test('when return to a visited module, the last visited view is preserved', async () => {
		const { user } = setup(
			<>
				<Switch>
					<Route path={`/${FILES_ROUTE}/path1`}>
						<div>
							<span>Path 1 of Files module</span>
							<Link to={`/${FILES_ROUTE}/path2`}>Go to path2</Link>
						</div>
					</Route>
					<Route path={`/${FILES_ROUTE}/path2`}>
						<div>
							<span>Path 2 of Files module</span>
							<Link to={'/otherModule'}>Go to otherModule</Link>
						</div>
					</Route>
					<Route path={`/otherModule`}>Other module view</Route>
				</Switch>
				<PrimaryBarElement active={window.location.pathname.startsWith(`/${FILES_ROUTE}`)} />
			</>,
			{ initialRouterEntries: [`/${FILES_ROUTE}/path1`] }
		);
		expect(screen.getByText(/Path 1 of Files module/i)).toBeVisible();
		await user.click(screen.getByRole('link', { name: 'Go to path2' }));
		expect(screen.getByText(/Path 2 of Files module/i)).toBeVisible();
		expect(screen.queryByText(/Path 1 of Files module/i)).not.toBeInTheDocument();
		await user.click(screen.getByRole('link', { name: 'Go to otherModule' }));
		expect(screen.getByText(/Other module view/i)).toBeVisible();
		expect(screen.queryByText(/Path 2 of Files module/i)).not.toBeInTheDocument();

		// expect(screen.queryByText(/Other module view/i)).not.toBeInTheDocument();
		// expect(screen.getByText(/Path 2 of Files module/i)).toBeVisible();
	});
});
