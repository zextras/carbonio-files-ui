/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';
import { keyBy } from 'lodash';
import { act } from 'react-dom/test-utils';
import { Link, Switch, Route, useLocation } from 'react-router-dom';

import { PrimaryBarElement } from './PrimaryBarElement';
import { uploadVar } from '../carbonio-files-ui-common/apollo/uploadVar';
import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';
import { ICON_REGEXP } from '../carbonio-files-ui-common/constants/test';
import { populateUploadItems } from '../carbonio-files-ui-common/mocks/mockUtils';
import { UploadStatus } from '../carbonio-files-ui-common/types/graphql/client-types';
import { setup } from '../carbonio-files-ui-common/utils/testUtils';

describe('PrimaryBarElement', () => {
	test('should render an alert icon if an upload fails', () => {
		const uploadItems = populateUploadItems(2);
		uploadItems[0].status = UploadStatus.FAILED;
		uploadItems[1].status = UploadStatus.COMPLETED;
		uploadVar(keyBy(uploadItems, (item) => item.id));
		setup(<PrimaryBarElement active />);
		expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
		act(() => {
			uploadVar({
				...uploadVar(),
				[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
			});
		});
		expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
	});
	test('when return to a visited module, the last visited view is preserved', async () => {
		// we are using the '/test' because in the PrimaryBarElement.tsx component we used a replace function
		// to remove the first '/files' which is added automatically by the shell.
		// For this test we need to check that the PrimaryBarElement navigates to the last valid location of Files
		// but the test environment works without the '/files' and does not add automatically
		const TestComponent = (): JSX.Element => {
			const location = useLocation();
			return (
				<>
					<Switch>
						<Route path={`/test${FILES_ROUTE}/path1`}>
							<div>
								<span>Path 1 of Files module</span>
								<Link to={`/test${FILES_ROUTE}/path2`}>Go to path2</Link>
							</div>
						</Route>
						<Route path={`/test${FILES_ROUTE}/path2`}>
							<div>
								<span>Path 2 of Files module</span>
								<Link to={'/otherModule'}>Go to otherModule</Link>
							</div>
						</Route>
						<Route path={`/otherModule`}>Other module view</Route>
					</Switch>
					<PrimaryBarElement active={location.pathname.startsWith(`/test${FILES_ROUTE}`)} />
				</>
			);
		};

		const { user, getByRoleWithIcon } = setup(<TestComponent />, {
			initialRouterEntries: [`/test${FILES_ROUTE}/path1`]
		});
		expect(screen.getByText(/Path 1 of Files module/i)).toBeVisible();
		await user.click(screen.getByRole('link', { name: 'Go to path2' }));
		expect(screen.getByText(/Path 2 of Files module/i)).toBeVisible();
		expect(screen.queryByText(/Path 1 of Files module/i)).not.toBeInTheDocument();
		await user.click(screen.getByRole('link', { name: 'Go to otherModule' }));
		expect(screen.getByText(/Other module view/i)).toBeVisible();
		expect(screen.queryByText(/Path 2 of Files module/i)).not.toBeInTheDocument();
		await user.click(getByRoleWithIcon('button', { icon: 'icon: DriveOutline' }));
		await screen.findByText(/Path 2 of Files module/i);
		expect(screen.queryByText(/Other module view/i)).not.toBeInTheDocument();
		expect(screen.getByText(/Path 2 of Files module/i)).toBeVisible();
	});
});
