/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act } from '@testing-library/react';

import { Notification } from './Notifications';
import { ICON_REGEXP, SELECTORS } from '../../../constants/test';
import { screen, setup, within } from '../../../tests/utils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import { mockGetNotifications } from '../../../utils/resolverMocks';

describe('Notifications', () => {
	// DONE - should render the notification button without the counter badge if there are no notifications
	// NOT DONE - should render the notification button with the counter badge if there are notifications
	// NOT DONE - should remove the counter badge when the user clicks on the notification's button
	// NOT DONE - should render the tooltip of the notification's button

	// - should render the empty message if there are no notifications (+ expect della chiamata)

	// - should render "<User_A> shared <Node_X> with you" when a user shares a node with you (type NEW_SHARE) (+ expect della chiamata)
	// - should render "<User_A> added <Node_X> in <Folder_Z>" when a user adds a node in a folder you shared (type ADDED_NODE) (+ expect della chiamata)
	// - should render "<User_A> removed <Node_X> in <Folder_Z>" when a user remove a node in a folder you shared (REMOVED_NODE) (+ expect della chiamata)

	// DONE - should render the tooltip of the refresh button
	// - should call the query when the user clicks on the refresh button
	// test pagination
	it('should render the notification button without the counter badge if there are no notifications', async () => {
		const mocks = {
			Query: {
				getNotifications: mockGetNotifications([])
			}
		} satisfies Partial<Resolvers>;
		setup(<Notification />, { mocks });

		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		expect(
			screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
		).toBeVisible();
		expect(screen.queryByTestId('badge-counter')).not.toBeInTheDocument();
	});

	it('should render the notification button with the counter badge if there are notifications', async () => {
		const mocks = {
			Query: {
				getNotifications: mockGetNotifications([])
			}
		} satisfies Partial<Resolvers>;
		setup(<Notification />, { mocks });

		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		expect(
			screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
		).toBeVisible();
		const badgeCounter = screen.getByTestId('badge-counter');
		expect(within(badgeCounter).getByText('1')).toBeVisible();
	});

	it('should remove the counter badge when the user clicks on the notification button', async () => {
		// mockare la query
		const { user } = setup(<Notification />);

		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(screen.queryByTestId('badge-counter')).not.toBeInTheDocument();
	});

	it('should render the tooltip of the notification button', async () => {
		// mockare la query
		const { user } = setup(<Notification />);

		await user.hover(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(await screen.findByText(/notifications/i)).toBeVisible();
	});

	it('should render the empty message if there are no notifications', async () => {
		// mockare la query
		const { user } = setup(<Notification />);

		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(screen.getByText(/notifications/)).toBeVisible();
		expect(
			screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
		).toBeVisible();
		expect(screen.getByTestId('icon: BellOffOutline')).toBeVisible();
		expect(screen.getByText(/no notifications/i)).toBeVisible();
		expect(screen.getByText(/you don’t have any notifications at the moment/i)).toBeVisible();
	});

	it('should render `User_A shared Node_X with you` when a user shares a node with you (type NEW_SHARE)', async () => {
		// mockare la query
		const { user } = setup(<Notification />);

		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
		// fix
		expect(screen.getByText(/user_a shared node_x with you/i)).toBeVisible();
		expect(screen.getByText(/data at time/i)).toBeVisible();
		// expect(queryCall).toHaveBeenCalledWith();
	});

	it('should render `User_A added Node_X in Folder_Z` when a user adds a node in a folder you shared (type ADDED_NODE)', async () => {
		// mockare la query
		const { user } = setup(<Notification />);

		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
		// fix
		expect(screen.getByText(/User_A added Node_X in Folder_Z/i)).toBeVisible();
		expect(screen.getByText(/data at time/i)).toBeVisible();
		// expect(queryCall).toHaveBeenCalledWith();
	});

	it('should render `User_A removed Node_X in Folder_Z` when a user remove a node in a folder you shared (REMOVED_NODE) (+ expect della chiamata)', async () => {
		// mockare la query
		const { user } = setup(<Notification />);

		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
		// fix
		expect(screen.getByText(/User_A removed Node_X in Folder_Z/i)).toBeVisible();
		expect(screen.getByText(/data at time/i)).toBeVisible();
		// expect(queryCall).toHaveBeenCalledWith();
	});

	it('should render the tooltip of the refresh button', async () => {
		const { user } = setup(<Notification />);

		await user.hover(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification }));
		expect(await screen.findByText(/refresh/i)).toBeVisible();
	});

	it.todo('should refresh the notifications when the user clicks on the refresh button');
	it.todo('should render the first 25 notifications and load more when the user scrolls down');
});
