/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { Mock } from 'vitest';

import { getDateNotification } from './NotificationItem';
import { Notifications } from './Notifications';
import server from '../../../../mocks/server';
import { lastSeenNotificationsVar } from '../../../apollo/lastSeenNotificationsVar';
import { NOTIFICATIONS_LOAD_LIMIT } from '../../../constants';
import { COLORS, ICON_REGEXP, SELECTORS } from '../../../constants/test';
import {
	populateAddedNodeNotification,
	populateNewShareNotification,
	populateRemovedNodeNotification,
	populateSucceededRecordingNotification,
	populateTransferredOwnershipNotification
} from '../../../mocks/mockUtils';
import { screen, setup, triggerListLoadMore } from '../../../tests/utils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import {
	AddedNodeType,
	GetNotificationsDocument,
	RemovedNodeType
} from '../../../types/graphql/types';
import { mockGetNotifications } from '../../../utils/resolverMocks';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useNavigate: (): Mock => mockNavigate
	};
});

describe('Notifications', () => {
	beforeEach(() => {
		lastSeenNotificationsVar(0);
	});

	it('should change the icon everytime the user clicks on the chevron', async () => {
		const mocks = {
			Query: {
				getNotifications: mockGetNotifications(0, [])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<Notifications />, { mocks });

		const chevronRight = screen.getByRoleWithIcon('button', {
			icon: ICON_REGEXP.chevronRightNotifications
		});
		expect(chevronRight).toBeVisible();
		await user.click(chevronRight);
		expect(
			screen.queryByRoleWithIcon('button', {
				icon: ICON_REGEXP.chevronRightNotifications
			})
		).not.toBeInTheDocument();
		const chevronLeft = screen.getByRoleWithIcon('button', {
			icon: ICON_REGEXP.chevronLeftNotifications
		});
		expect(chevronLeft).toBeVisible();
		await user.click(chevronLeft);
		expect(chevronRight).toBeVisible();
	});

	describe('Notification Popover', () => {
		it('should open the notifications popover with the empty message if there are no notifications', async () => {
			const mocks = {
				Query: {
					getNotifications: mockGetNotifications(0, [])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<Notifications />, { mocks });

			await user.click(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.chevronRightNotifications
				})
			);
			expect(screen.getByText('Notifications')).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
			).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.noNotificationsIcon)).toBeVisible();
			expect(screen.getByText(/no notifications/i)).toBeVisible();
			expect(screen.getByText(/you don’t have any notifications at the moment/i)).toBeVisible();
		});

		it('should close the popover when the user clicks on the notification button if the popover is opened', async () => {
			const mocks = {
				Query: {
					getNotifications: mockGetNotifications(0, [])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<Notifications />, { mocks });

			// click on the chevron to open the popover
			await user.click(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.chevronRightNotifications
				})
			);
			// click on the chevron to close the popover
			await user.click(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.chevronLeftNotifications
				})
			);
			expect(screen.queryByText(/notifications/i)).not.toBeInTheDocument();
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
			).not.toBeInTheDocument();
		});

		describe('List of notifications', () => {
			it('should render `User_A shared Node_X with you` when a user shares a node with you (type NEW_SHARE)', async () => {
				const notification = populateNewShareNotification();
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [notification])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notifications />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
				expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
				expect(screen.getByText(notification.node.name)).toBeVisible();
				expect(screen.getByText(/shared with you/i)).toBeVisible();
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
					const { user } = setup(<Notifications />, { mocks });

					await user.click(
						screen.getByRoleWithIcon('button', {
							icon: ICON_REGEXP.chevronRightNotifications
						})
					);
					expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
					expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
					expect(screen.getByText(notification.added_node.name)).toBeVisible();
					expect(screen.getByText(notification.destination_folder.name)).toBeVisible();
					expect(screen.getByText(/added in/i)).toBeVisible();
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
					const { user } = setup(<Notifications />, { mocks });

					await user.click(
						screen.getByRoleWithIcon('button', {
							icon: ICON_REGEXP.chevronRightNotifications
						})
					);
					expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
					expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
					expect(screen.getByText(notification.removed_node.name)).toBeVisible();
					expect(screen.getByText(notification.origin_folder.name)).toBeVisible();
					expect(screen.getByText(/removed from/i)).toBeVisible();
					const date = getDateNotification(notification.created_at);
					expect(screen.getByText(date)).toBeVisible();
				}
			);

			it('should render `User_A transferred ownership of items to you. You’ll find them in folder Folder_Z` when a user transfers ownership of items to you (TRANSFERRED_OWNERSHIP)', async () => {
				const notification = populateTransferredOwnershipNotification();
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [notification])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notifications />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
				expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
				expect(screen.getByText(notification.resulting_node.name)).toBeVisible();
				expect(screen.getByText(/transferred ownership of items to you/i)).toBeVisible();
			});

			it('should render `Node_X saved in Folder_Z` when a recording succeeded (type SUCCEEDED_RECORDING)', async () => {
				const notification = populateSucceededRecordingNotification();
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [notification])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notifications />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				expect(screen.getByTestId(SELECTORS.avatar)).toBeVisible();
				expect(screen.getByText(notification.recording_node.name)).toBeVisible();
				expect(screen.getByText(notification.recording_destination_node.name)).toBeVisible();
				expect(screen.getByText(/saved in/i)).toBeVisible();
				const date = getDateNotification(notification.created_at);
				expect(screen.getByText(date)).toBeVisible();
			});

			it('should render the unread notifications in Primary (Regular) color and the other ones in Text (Regular)', async () => {
				const notifications = Array.from({ length: 3 }, () => populateAddedNodeNotification());
				const unreadNotifications =
					notifications.length > 0 ? faker.number.int({ min: 0, max: notifications.length }) : 0;
				const lastSeen = faker.date.recent().getTime();
				notifications.forEach((notification, id) => {
					notification.created_at =
						id < unreadNotifications ? lastSeen + id + 1 : lastSeen - id - 1;
				});
				server.use(
					graphql.query(GetNotificationsDocument, () =>
						HttpResponse.json({
							data: {
								getNotifications: {
									__typename: 'NotificationPage',
									last_seen: lastSeen,
									notifications,
									page_token: null,
									unread: unreadNotifications
								}
							}
						})
					)
				);
				const { user } = setup(<Notifications />);

				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				notifications.forEach((notification, index) => {
					expect(screen.getByText(notification.triggering_user.email)).toHaveStyle({
						color: index < unreadNotifications ? COLORS.primary.regular : COLORS.text.regular
					});
					expect(screen.getByText(notification.added_node.name)).toHaveStyle({
						color: index < unreadNotifications ? COLORS.primary.regular : COLORS.text.regular
					});
					expect(screen.getByText(notification.destination_folder.name)).toHaveStyle({
						color: index < unreadNotifications ? COLORS.primary.regular : COLORS.text.regular
					});
				});
				const addedInElements = screen.getAllByText(/added in/i);
				addedInElements.forEach((el, id) => {
					expect(el).toHaveStyle({
						color: id < unreadNotifications ? COLORS.primary.regular : COLORS.text.regular
					});
				});
			});

			it('should remove the primary (Regular) color and make it in Text (Regular) when the user opens the notification popover, close it and opens it again', async () => {
				const notifications = Array.from({ length: 3 }, () => populateAddedNodeNotification()).sort(
					(a, b) => b.created_at - a.created_at
				);

				const unreadNotifications = faker.number.int({ min: 0, max: notifications.length });
				const lastSeen =
					unreadNotifications < notifications.length
						? notifications[unreadNotifications].created_at
						: notifications[notifications.length - 1].created_at - 1;
				server.use(
					graphql.query(GetNotificationsDocument, () =>
						HttpResponse.json({
							data: {
								getNotifications: {
									__typename: 'NotificationPage',
									last_seen: lastSeen,
									notifications,
									page_token: null,
									unread: unreadNotifications
								}
							}
						})
					)
				);
				const { user } = setup(<Notifications />);

				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				notifications.forEach((notification, index) => {
					expect(screen.getByText(notification.triggering_user.email)).toHaveStyle({
						color: index < unreadNotifications ? COLORS.primary.regular : COLORS.text.regular
					});
					expect(screen.getByText(notification.added_node.name)).toHaveStyle({
						color: index < unreadNotifications ? COLORS.primary.regular : COLORS.text.regular
					});
					expect(screen.getByText(notification.destination_folder.name)).toHaveStyle({
						color: index < unreadNotifications ? COLORS.primary.regular : COLORS.text.regular
					});
				});
				// close the notification popover
				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronLeftNotifications
					})
				);
				// open the notification popover again
				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				await waitFor(() => {
					expect(lastSeenNotificationsVar()).toBe(notifications[0].created_at);
				});

				notifications.forEach((notification) => {
					expect(screen.getByText(notification.triggering_user.email)).toHaveStyle({
						color: COLORS.text.regular
					});
					expect(screen.getByText(notification.added_node.name)).toHaveStyle({
						color: COLORS.text.regular
					});
					expect(screen.getByText(notification.destination_folder.name)).toHaveStyle({
						color: COLORS.text.regular
					});
				});
			});

			it.each([
				{ name: 'NewShare', populate: populateNewShareNotification },
				{ name: 'TransferredOwnership', populate: populateTransferredOwnershipNotification },
				{ name: 'AddedNode', populate: populateAddedNodeNotification },
				{ name: 'RemovedNode', populate: populateRemovedNodeNotification },
				{ name: 'SucceededRecording', populate: populateSucceededRecordingNotification }
			])('should navigate when clicking on $name notification', async ({ populate }) => {
				const notification = populate();
				const mocks = {
					Query: {
						getNotifications: mockGetNotifications(0, [notification])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Notifications />, { mocks });
				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				await user.click(screen.getByTestId(SELECTORS.avatar));

				expect(mockNavigate).toHaveBeenCalled();
			});

			describe('Pagination', () => {
				it('should render new pagination if the user reaches the list bottom element', async () => {
					const notifications = Array.from({ length: NOTIFICATIONS_LOAD_LIMIT + 5 }, () =>
						populateAddedNodeNotification()
					);
					const firstPage = notifications.slice(0, NOTIFICATIONS_LOAD_LIMIT);
					const secondPage = notifications.slice(NOTIFICATIONS_LOAD_LIMIT);
					server.use(
						graphql.query(GetNotificationsDocument, ({ variables }) => {
							if (!variables?.page_token) {
								return HttpResponse.json({
									data: {
										getNotifications: {
											__typename: 'NotificationPage',
											last_seen: faker.date.recent().getTime(),
											notifications: firstPage,
											page_token: firstPage[firstPage.length - 1].id,
											unread: 0
										}
									}
								});
							}
							return HttpResponse.json({
								data: {
									getNotifications: {
										__typename: 'NotificationPage',
										last_seen: faker.date.recent().getTime(),
										notifications: secondPage,
										page_token: null,
										unread: 0
									}
								}
							});
						})
					);
					const { user } = setup(<Notifications />);

					await user.click(
						screen.getByRoleWithIcon('button', {
							icon: ICON_REGEXP.chevronRightNotifications
						})
					);
					firstPage.forEach((notification) => {
						expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
					});
					secondPage.forEach((notification) => {
						expect(screen.queryByText(notification.triggering_user.email)).not.toBeInTheDocument();
					});
					triggerListLoadMore();
					await screen.findByText(secondPage[0].triggering_user.email);
					firstPage.forEach((notification) => {
						expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
					});
					secondPage.forEach((notification) => {
						expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
					});
				});

				it('should keep the unread notifications in primary (Regular) color if the user reaches a new pagination', async () => {
					const notifications = Array.from({ length: NOTIFICATIONS_LOAD_LIMIT + 1 }, () =>
						populateAddedNodeNotification()
					);
					const firstPage = notifications.slice(0, NOTIFICATIONS_LOAD_LIMIT);
					const secondPage = notifications.slice(NOTIFICATIONS_LOAD_LIMIT);
					const lastSeen = faker.date.recent().getTime();
					const firstNotification = notifications[0];
					firstNotification.created_at = lastSeen + 1;
					server.use(
						graphql.query(GetNotificationsDocument, ({ variables }) => {
							if (!variables?.page_token) {
								return HttpResponse.json({
									data: {
										getNotifications: {
											__typename: 'NotificationPage',
											last_seen: lastSeen,
											notifications: firstPage,
											page_token: firstPage[firstPage.length - 1].id,
											unread: 1
										}
									}
								});
							}
							return HttpResponse.json({
								data: {
									getNotifications: {
										__typename: 'NotificationPage',
										last_seen: lastSeen,
										notifications: secondPage,
										page_token: null,
										unread: 0
									}
								}
							});
						})
					);
					const { user } = setup(<Notifications />);

					await user.click(
						screen.getByRoleWithIcon('button', {
							icon: ICON_REGEXP.chevronRightNotifications
						})
					);
					expect(screen.getByText(firstNotification.triggering_user.email)).toHaveStyle({
						color: COLORS.primary.regular
					});
					triggerListLoadMore();
					await screen.findByText(secondPage[0].triggering_user.email);
					expect(screen.getByText(firstNotification.triggering_user.email)).toHaveStyle({
						color: COLORS.primary.regular
					});
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
				const { user } = setup(<Notifications />, { mocks });

				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				await user.hover(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
				);
				expect(await screen.findByText(/Check for updates/i)).toBeVisible();
			});

			it('should render the new notifications when the user clicks on the refresh button', async () => {
				const notifications = Array.from({ length: 3 }, () => populateAddedNodeNotification());
				let calledOnce = false;
				server.use(
					graphql.query(GetNotificationsDocument, () => {
						if (!calledOnce) {
							calledOnce = true;
							return HttpResponse.json({
								data: {
									getNotifications: {
										__typename: 'NotificationPage',
										last_seen: faker.date.recent().getTime(),
										notifications: [],
										page_token: null,
										unread: 0
									}
								}
							});
						}
						return HttpResponse.json({
							data: {
								getNotifications: {
									__typename: 'NotificationPage',
									last_seen: faker.date.recent().getTime(),
									notifications,
									page_token: null,
									unread: 1
								}
							}
						});
					})
				);
				const { user } = setup(<Notifications />);

				await user.click(
					screen.getByRoleWithIcon('button', {
						icon: ICON_REGEXP.chevronRightNotifications
					})
				);
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshNotification })
				);
				notifications.forEach((notification) => {
					expect(screen.getByText(notification.triggering_user.email)).toBeVisible();
				});
			});
		});
	});
});
