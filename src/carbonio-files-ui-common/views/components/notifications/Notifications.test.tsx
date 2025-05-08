/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act } from '@testing-library/react';

import { getDateNotification } from './NotificationItem';
import { Notification } from './Notifications';
import { COLORS, ICON_REGEXP, SELECTORS } from '../../../constants/test';
import {
	populateAddedNodeNotification,
	populateNewShareNotification,
	populateRemovedNodeNotification
} from '../../../mocks/mockUtils';
import { screen, setup, triggerListLoadMore, within } from '../../../tests/utils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import { AddedNodeType, RemovedNodeType } from '../../../types/graphql/types';
import { mockGetNotifications } from '../../../utils/resolverMocks';

describe('Notifications', () => {
	it('should render the notification button without the counter badge if there are no notifications (unread is 0)', async () => {
		const mocks = {
			Query: {
				getNotifications: mockGetNotifications(0, [])
			}
		} satisfies Partial<Resolvers>;
		setup(<Notification />, { mocks });

		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		expect(
			screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
		).toBeVisible();
		expect(screen.queryByTestId(SELECTORS.badgeCounter)).not.toBeInTheDocument();
	});

	it('should render the notification button with the counter badge if there are notifications (unread is not 0)', async () => {
		const notification = populateAddedNodeNotification();
		const unreadNotifications = 1;
		const mocks = {
			Query: {
				getNotifications: mockGetNotifications(unreadNotifications, [notification])
			}
		} satisfies Partial<Resolvers>;
		setup(<Notification />, { mocks });

		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		expect(
			screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
		).toBeVisible();
		const badgeCounter = screen.getByTestId(SELECTORS.badgeCounter);
		expect(within(badgeCounter).getByText(unreadNotifications)).toBeVisible();
	});

	it('should remove the counter badge when the user clicks on the notification button', async () => {
		const notification = populateAddedNodeNotification();
		const mocks = {
			Query: {
				getNotifications: mockGetNotifications(1, [notification])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<Notification />, { mocks });

		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		// the badge counter is visible
		expect(screen.getByTestId(SELECTORS.badgeCounter)).toBeVisible();
		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(screen.queryByTestId(SELECTORS.badgeCounter)).not.toBeInTheDocument();
	});

	it('should render the tooltip of the notification button', async () => {
		const mocks = {
			Query: {
				getNotifications: mockGetNotifications(0, [])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<Notification />, { mocks });

		await user.hover(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications }));
		expect(await screen.findByText(/notifications/i)).toBeVisible();
	});

	describe('Notification Popover', () => {
		it('should render the popover with the empty message if there are no notifications', async () => {
			const mocks = {
				Query: {
					getNotifications: mockGetNotifications(0, [])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<Notification />, { mocks });

			await user.click(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
			);
			expect(screen.getByText('Notifications')).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
			).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.noNotificationsIcon)).toBeVisible();
			expect(screen.getByText(/no notifications/i)).toBeVisible();
			expect(screen.getByText(/you don’t have any notifications at the moment/i)).toBeVisible();
		});

		describe('Close popover', () => {
			it('should close the popover when the user clicks on the notification button if the popover is opened', async () => {
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				// click on the notification button to open the popover
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				// click on the notification button to close the popover
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				expect(screen.queryByText(/notifications/i)).not.toBeInTheDocument();
				expect(
					screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
				).not.toBeInTheDocument();
			});

			it.todo('should close the popover when clicks outside the popover');
		});

		describe('List of notifications', () => {
			it('should render `User_A shared Node_X with you` when a user shares a node with you (type NEW_SHARE)', async () => {
				const notification = populateNewShareNotification();
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [notification])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
				expect(
					screen.getByText(
						`${notification.triggering_user.email} shared ${notification.node.name} with you`
					)
				).toBeVisible();
				const date = getDateNotification(notification.created_at);
				expect(screen.getByText(date)).toBeVisible();
			});

			it.each([AddedNodeType.Create, AddedNodeType.Upload, AddedNodeType.Copy, AddedNodeType.Move])(
				'should render `User_A added Node_X in Folder_Z` when a user %s a node in a folder you shared (type ADDED_NODE)',
				async (type) => {
					const notification = populateAddedNodeNotification(type);
					const mocks = {
						Query: {
							getNotifications: mockGetNotifications(0, [notification])
						}
					} satisfies Partial<Resolvers>;
					const { user } = setup(<Notification />, { mocks });

					await user.click(
						screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
					);
					expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
					expect(
						screen.getByText(
							`${notification.triggering_user.email} added ${notification.added_node.name} in ${notification.destination_folder.name}`
						)
					).toBeVisible();
					const date = getDateNotification(notification.created_at);
					expect(screen.getByText(date)).toBeVisible();
				}
			);

			it.each([RemovedNodeType.Delete, RemovedNodeType.Move])(
				'should render `User_A removed Node_X from Folder_Z` when a user %s a node from a folder you shared (REMOVED_NODE)',
				async (type) => {
					const notification = populateRemovedNodeNotification(type);
					const mocks = {
						Query: {
							getNotifications: mockGetNotifications(0, [notification])
						}
					} satisfies Partial<Resolvers>;
					const { user } = setup(<Notification />, { mocks });

					await user.click(
						screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
					);
					expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
					expect(
						screen.getByText(
							`${notification.triggering_user.email} removed ${notification.removed_node.name} from ${notification.origin_folder.name}`
						)
					).toBeVisible();
					const date = getDateNotification(notification.created_at);
					expect(screen.getByText(date)).toBeVisible();
				}
			);

			// test potenzialmente da togliere
			it('test renderizza tutti e tre i tipi contemporaneamente', async () => {
				const newShare = populateNewShareNotification();
				const addedNode = populateAddedNodeNotification();
				const removedNode = populateRemovedNodeNotification();
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [newShare, addedNode, removedNode])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				expect(screen.getAllByTestId(SELECTORS.avatar)).toHaveLength(3);
				expect(
					screen.getByText(
						`${removedNode.triggering_user.email} removed ${removedNode.removed_node.name} from ${removedNode.origin_folder.name}`
					)
				).toBeVisible();
				expect(
					screen.getByText(
						`${addedNode.triggering_user.email} added ${addedNode.added_node.name} in ${addedNode.destination_folder.name}`
					)
				).toBeVisible();
				expect(
					screen.getByText(
						`${newShare.triggering_user.email} shared ${newShare.node.name} with you`
					)
				).toBeVisible();
			});

			// fix test for pagination
			it('pagination', async () => {
				const notifications = Array.from({ length: 26 }, () => populateAddedNodeNotification());
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, notifications)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				const secondToLastNotification = notifications[notifications.length - 2];
				const lastNotification = notifications[notifications.length - 1];
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				expect(
					screen.getByText(
						`${notifications[0].triggering_user.email} added ${notifications[0].added_node.name} in ${notifications[0].destination_folder.name}`
					)
				).toBeVisible();
				expect(
					screen.getByText(
						`${secondToLastNotification.triggering_user.email} added ${secondToLastNotification.added_node.name} in ${secondToLastNotification.destination_folder.name}`
					)
				).toBeVisible();
				expect(
					screen.queryByText(
						`${lastNotification.triggering_user.email} added ${lastNotification.added_node.name} in ${lastNotification.destination_folder.name}`
					)
				).not.toBeInTheDocument();
				triggerListLoadMore();
				expect(
					await screen.findByText(
						`${lastNotification.triggering_user.email} added ${lastNotification.added_node.name} in ${lastNotification.destination_folder.name}`
					)
				).toBeVisible();
			});

			it('should render the unread notifications in Info (Regular) color and the other ones in Text (Regular)', async () => {
				const notifications = Array.from({ length: 3 }, () => populateAddedNodeNotification());
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(1, notifications)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				expect(
					screen.getByText(
						`${notifications[0].triggering_user.email} added ${notifications[0].added_node.name} in ${notifications[0].destination_folder.name}`
					)
				).toHaveStyle({
					color: COLORS.info.regular
				});
				expect(
					screen.getByText(
						`${notifications[1].triggering_user.email} added ${notifications[1].added_node.name} in ${notifications[1].destination_folder.name}`
					)
				).toHaveStyle({
					color: COLORS.text.regular
				});
				expect(
					screen.getByText(
						`${notifications[2].triggering_user.email} added ${notifications[2].added_node.name} in ${notifications[2].destination_folder.name}`
					)
				).toHaveStyle({
					color: COLORS.text.regular
				});
			});

			it('should remove the Info (Regular) color and make it in Text (Regular) when the user opens the notification popover, close it and opens it again', async () => {
				const notifications = Array.from({ length: 3 }, () => populateAddedNodeNotification());
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(1, notifications)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				// close the notification popover
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				// open the notification popover again
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				expect(
					screen.getByText(
						`${notifications[0].triggering_user.email} added ${notifications[0].added_node.name} in ${notifications[0].destination_folder.name}`
					)
				).toHaveStyle({
					color: COLORS.text.regular
				});
			});

			// fix test for pagination
			it('should keep the unread notifications in Info (Regular) color if you reach a new pagination', async () => {
				const notifications = Array.from({ length: 26 }, () => populateAddedNodeNotification());
				const secondToLastNotification = notifications[notifications.length - 2];
				const lastNotification = notifications[notifications.length - 1];
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, notifications)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				expect(
					screen.getByText(
						`${notifications[0].triggering_user.email} added ${notifications[0].added_node.name} in ${notifications[0].destination_folder.name}`
					)
				).toBeVisible();
				expect(
					screen.getByText(
						`${secondToLastNotification.triggering_user.email} added ${secondToLastNotification.added_node.name} in ${secondToLastNotification.destination_folder.name}`
					)
				).toBeVisible();
				expect(screen.queryByText(lastNotification.triggering_user.email)).not.toBeInTheDocument();
				triggerListLoadMore();
				expect(
					screen.getByText(
						`${lastNotification.triggering_user.email} added ${lastNotification.added_node.name} in ${lastNotification.destination_folder.name}`
					)
				).toBeVisible();
				expect(screen.getByText(notifications[0].triggering_user.email)).toHaveStyle({
					color: COLORS.info.regular
				});
			});
		});

		describe('Refresh button', () => {
			it('should render the tooltip of the refresh button', async () => {
				const notification = populateAddedNodeNotification();
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [notification])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				await user.hover(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
				);
				expect(await screen.findByText(/refresh/i)).toBeVisible();
			});

			// understand how to do it
			it('should render the new notifications when the user clicks on the refresh button', async () => {
				const notification = populateAddedNodeNotification(AddedNodeType.Create);
				const getNotificationsMock = jest
					.fn()
					.mockReturnValueOnce(mockGetNotifications(0, [])) // initial empty
					.mockReturnValueOnce(mockGetNotifications(1, [notification])); // after refresh
				const mocks = {
					Query: {
						getNotifications: getNotificationsMock
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notification />, { mocks });
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.filesNotifications })
				);
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
				);
				expect(screen.getByText('Notifications')).toBeVisible();
				expect(
					await screen.findByText(
						`${notification.triggering_user.email} added ${notification.added_node.name} in ${notification.destination_folder.name}`
					)
				).toBeVisible();
			});

			it.todo(
				'should keep the unread notifications in Primary (Regular) color if you reach a new pagination (after refreshing)'
			);
		});
	});
});
