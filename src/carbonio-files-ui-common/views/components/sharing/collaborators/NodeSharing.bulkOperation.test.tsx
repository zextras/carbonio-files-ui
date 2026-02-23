/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { act } from 'react';

import { NodeSharing } from './NodeSharing';
import { LOGGED_USER } from '../../../../../mocks/constants';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import { populateNode, populateShare, populateUser } from '../../../../mocks/mockUtils';
import { screen, setup, within } from '../../../../tests/utils';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import { SharePermission } from '../../../../types/graphql/types';
import {
	mockDeleteShares,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockGetNode,
	mockUpdateShares
} from '../../../../utils/resolverMocks';
import { getChipLabel } from '../../../../utils/utils';

describe('bulk operation', () => {
	it('should not render the edit/remove buttons and the number of selected collaborators when the user does not select collaborators', async () => {
		const node = populateNode();
		node.owner = populateUser();
		const loggedUser = populateUser(LOGGED_USER.id);
		const user2 = populateUser();
		const share1 = populateShare(node, node.id, loggedUser);
		const share2 = populateShare(node, node.id, user2);
		share1.permission = SharePermission.ReadAndShare;
		share2.permission = SharePermission.ReadAndShare;
		node.shares = [share1, share2];
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});

		const header = screen.getByTestId(SELECTORS.nodeSharingCollaboratorsHeader);
		expect(within(header).queryByText(/selected/i)).not.toBeInTheDocument();
		expect(
			within(header).queryByTestId(ICON_REGEXP.removeCollaboratorsSeleced)
		).not.toBeInTheDocument();
		expect(
			within(header).queryByTestId(ICON_REGEXP.editCollaboratorsSeleced)
		).not.toBeInTheDocument();
	});

	it('should render the number of selected collaborators and the edit/remove buttons when the user selects collaborators', async () => {
		const node = populateNode();
		node.owner = populateUser();
		const loggedUser = populateUser(LOGGED_USER.id);
		const user2 = populateUser();
		const share1 = populateShare(node, node.id, loggedUser);
		const share2 = populateShare(node, node.id, user2);
		share1.permission = SharePermission.ReadAndShare;
		share2.permission = SharePermission.ReadAndShare;
		node.shares = [share1, share2];
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
		await user.click(checkboxes[1]);
		const header = screen.getByTestId(SELECTORS.nodeSharingCollaboratorsHeader);
		expect(within(header).getByText(/1 selected/i)).toBeVisible();
		expect(within(header).getByTestId(ICON_REGEXP.removeCollaboratorsSeleced)).toBeVisible();
		expect(within(header).getByTestId(ICON_REGEXP.editCollaboratorsSeleced)).toBeVisible();
	});

	it('should disable list items button if the selection is active', async () => {
		const node = populateNode();
		node.owner = populateUser();
		const loggedUser = populateUser(LOGGED_USER.id);
		const user2 = populateUser();
		const share1 = populateShare(node, node.id, loggedUser);
		const share2 = populateShare(node, node.id, user2);
		share1.permission = SharePermission.ReadAndShare;
		share2.permission = SharePermission.ReadAndShare;
		node.shares = [share1, share2];
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
		await user.click(checkboxes[1]);
		const trashButtons = screen.getAllByRoleWithIcon('button', {
			icon: ICON_REGEXP.removeCollaboratorsSeleced
		});
		trashButtons.forEach((button) => {
			if (button.closest('[data-testid="sharing-collaborators-section"]')) {
				expect(button).toBeDisabled();
			}
		});
	});

	describe('remove collaborators', () => {
		describe('select all', () => {
			it('should render modal when the user selects all collaborators and clicks on remove button', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const user3 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				const share3 = populateShare(node, node.id, user3);
				share1.permission = SharePermission.ReadAndShare;
				share2.permission = SharePermission.ReadAndShare;
				share3.permission = SharePermission.ReadAndShare;
				node.shares = [share1, share2, share3];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const selectAllCheckbox = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked)[0];
				await user.click(selectAllCheckbox);
				expect(screen.getByText(/3 selected/i)).toBeVisible();
				const bulkTrashButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.removeCollaboratorsSeleced
				});
				const bulkTrashButton = bulkTrashButtons.find(
					(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
				)!;
				await user.click(bulkTrashButton);
				act(() => {
					vi.advanceTimersToNextTimer();
				});
				expect(screen.getByText('Remove all collaborators')).toBeVisible();
				expect(
					screen.getByText(
						"You're about to remove all collaborators from this file. After this action, only you will have access to the file and people it was shared with will no longer be able to view or edit it."
					)
				).toBeVisible();
				expect(screen.getByText(/This action cannot be undone/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /Cancel/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /Yes, remove all/i })).toBeVisible();
			});

			it('should remove all collaborators when the user confirms the deletion', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				share1.permission = SharePermission.ReadAndShare;
				share2.permission = SharePermission.ReadAndShare;
				node.shares = [share1, share2];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						deleteShares: mockDeleteShares([loggedUser.id, user2.id])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const selectAllCheckbox = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked)[0];
				await user.click(selectAllCheckbox);
				const bulkTrashButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.removeCollaboratorsSeleced
				});
				const bulkTrashButton = bulkTrashButtons.find(
					(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
				)!;
				await user.click(bulkTrashButton);
				act(() => {
					vi.advanceTimersToNextTimer();
				});
				await user.click(screen.getByRole('button', { name: /Yes, remove all/i }));
				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				expect(screen.queryByText(getChipLabel(user2))).not.toBeInTheDocument();
			});
		});

		describe('select multiple - not all', () => {
			it('should render modal when the user selects multiple collaborators and clicks on remove button', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const user3 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				const share3 = populateShare(node, node.id, user3);
				share1.permission = SharePermission.ReadAndShare;
				share2.permission = SharePermission.ReadAndShare;
				share3.permission = SharePermission.ReadAndShare;
				node.shares = [share1, share2, share3];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
				await user.click(checkboxes[1]);
				await user.click(checkboxes[2]);
				expect(screen.getByText(/2 selected/i)).toBeVisible();
				const bulkTrashButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.removeCollaboratorsSeleced
				});
				const bulkTrashButton = bulkTrashButtons.find(
					(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
				)!;
				await user.click(bulkTrashButton);
				act(() => {
					vi.advanceTimersToNextTimer();
				});
				expect(screen.getByText('Remove collaborators')).toBeVisible();
				expect(
					screen.getByText(/You're about to remove 2 collaborator\(s\) from this file/i)
				).toBeVisible();
				expect(screen.getByText(/This action cannot be undone/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /Cancel/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /Yes, remove/i })).toBeVisible();
			});

			it('should remove multiple collaborators', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const user3 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				const share3 = populateShare(node, node.id, user3);
				share1.permission = SharePermission.ReadAndShare;
				share2.permission = SharePermission.ReadAndShare;
				share3.permission = SharePermission.ReadAndShare;
				node.shares = [share1, share2, share3];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						deleteShares: mockDeleteShares([loggedUser.id, user2.id])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
				await user.click(checkboxes[1]);
				await user.click(checkboxes[2]);
				const bulkTrashButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.removeCollaboratorsSeleced
				});
				const bulkTrashButton = bulkTrashButtons.find(
					(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
				)!;
				await user.click(bulkTrashButton);
				act(() => {
					vi.advanceTimersToNextTimer();
				});
				await user.click(screen.getByRole('button', { name: /Yes, remove/i }));
				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
				expect(screen.queryByText(getChipLabel(loggedUser))).not.toBeInTheDocument();
				expect(screen.queryByText(getChipLabel(user2))).not.toBeInTheDocument();
				expect(screen.getByText(getChipLabel(user3))).toBeVisible();
			});
		});

		describe('select single', () => {
			it('should render modal when the user selects only one collaborator and clicks on remove button', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				share1.permission = SharePermission.ReadAndShare;
				share2.permission = SharePermission.ReadAndShare;
				node.shares = [share1, share2];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				// select only the other collaborator (not yourself)
				// checkboxes: [0] = select-all, [1] = logged user (listed first), [2] = user2
				const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
				await user.click(checkboxes[2]);
				expect(screen.getByText(/1 selected/i)).toBeVisible();
				const bulkTrashButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.removeCollaboratorsSeleced
				});
				const bulkTrashButton = bulkTrashButtons.find(
					(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
				)!;
				await user.click(bulkTrashButton);
				act(() => {
					vi.advanceTimersToNextTimer();
				});
				expect(screen.getByText('Remove collaborator')).toBeVisible();
				expect(
					screen.getByText(/Are you sure to remove all the access permission previously given to/i)
				).toBeVisible();
				expect(screen.getByText(/this action cannot be undone./i)).toBeVisible();
				expect(screen.getByRole('button', { name: /No, cancel/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /Yes, remove/i })).toBeVisible();
			});

			it('should render modal when the user selects only his collaborator item and clicks on remove button', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				share1.permission = SharePermission.ReadAndShare;
				share2.permission = SharePermission.ReadAndShare;
				node.shares = [share1, share2];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				// select only yourself (logged user is listed first)
				// checkboxes: [0] = select-all, [1] = logged user
				const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
				await user.click(checkboxes[1]);
				expect(screen.getByText(/1 selected/i)).toBeVisible();
				const bulkTrashButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.removeCollaboratorsSeleced
				});
				const bulkTrashButton = bulkTrashButtons.find(
					(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
				)!;
				await user.click(bulkTrashButton);
				act(() => {
					vi.advanceTimersToNextTimer();
				});
				expect(
					screen.getByText(/Are you sure to remove yourself from this collaboration/i)
				).toBeVisible();
				expect(
					screen.getByText(/All the access permission previously given to you will be lost/i)
				).toBeVisible();
				expect(screen.getByRole('button', { name: /Yes, remove/i })).toBeVisible();
			});
		});
	});

	describe('edit permissions', () => {
		it('should update permission of the collaborators selected', async () => {
			const node = populateNode();
			node.owner = populateUser();
			const loggedUser = populateUser(LOGGED_USER.id);
			const user2 = populateUser();
			const share1 = populateShare(node, node.id, loggedUser);
			const share2 = populateShare(node, node.id, user2);
			share1.permission = SharePermission.ReadWriteAndShare;
			share2.permission = SharePermission.ReadWriteAndShare;
			node.shares = [share1, share2];
			node.permissions.can_share = true;
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const updatedShare = {
				...share2,
				permission: SharePermission.ReadOnly
			};
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					updateShares: mockUpdateShares(updatedShare)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			// select the other user (not yourself)
			// checkboxes: [0] = select-all, [1] = logged user, [2] = user2
			const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
			await user.click(checkboxes[2]);
			expect(screen.getByText(/1 selected/i)).toBeVisible();
			const bulkEditButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanRead
			});
			const bulkEditButton = bulkEditButtons.find(
				(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
			)!;
			await user.click(bulkEditButton);
			const viewerSelection = screen.getByTestId(SELECTORS.exclusiveSelectionViewer);
			expect(within(viewerSelection).getByText(/viewer/i)).toBeVisible();
			await user.click(screen.getByRole('button', { name: /save/i }));
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
			const collaboratorsSection = screen.getByTestId('sharing-collaborators-section');
			const eyeIcons = within(collaboratorsSection).getAllByTestId(ICON_REGEXP.shareCanRead);
			expect(eyeIcons).toHaveLength(1);
			const shareOffIcons = within(collaboratorsSection).getAllByTestId(ICON_REGEXP.shareOff);
			expect(shareOffIcons).toHaveLength(1);
		});

		it('should render decrease rights modal if the user tries to reduce rights and he is also selected', async () => {
			const node = populateNode();
			node.owner = populateUser();
			const loggedUser = populateUser(LOGGED_USER.id);
			const user2 = populateUser();
			const share1 = populateShare(node, node.id, loggedUser);
			const share2 = populateShare(node, node.id, user2);
			share1.permission = SharePermission.ReadWriteAndShare;
			share2.permission = SharePermission.ReadWriteAndShare;
			node.shares = [share1, share2];
			node.permissions.can_share = true;
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			// select all (including yourself)
			const selectAllCheckbox = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked)[0];
			await user.click(selectAllCheckbox);
			expect(screen.getByText(/2 selected/i)).toBeVisible();
			const bulkEditButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanRead
			});
			const bulkEditButton = bulkEditButtons.find(
				(btn) => !btn.closest('[data-testid="sharing-collaborators-section"]')
			)!;
			await user.click(bulkEditButton);
			// switch to viewer (reduces rights for logged user who was editor+share)
			const viewerSelection = screen.getByTestId(SELECTORS.exclusiveSelectionViewer);
			await user.click(within(viewerSelection).getByText(/viewer/i));
			await user.click(screen.getByRole('button', { name: /save/i }));
			// the decrease rights modal should appear
			const modal = screen.getByTestId(SELECTORS.modal);
			act(() => {
				vi.advanceTimersToNextTimer();
			});
			expect(within(modal).getByText(/Decrease your current rights/i)).toBeVisible();
			expect(
				within(modal).getByText(
					"Are you sure to decrease your rights on this item? The action is permanent and you won't be able to restore the previous share's rights by yourself."
				)
			).toBeVisible();
			expect(
				within(modal).getByText(
					"You can always contact the shared item's owner if you need the previous permission to be restored."
				)
			).toBeVisible();
			expect(screen.getByText(/This action cannot be undone./i)).toBeVisible();
			expect(within(modal).getByRole('button', { name: /no, cancel/i })).toBeVisible();
			expect(within(modal).getByRole('button', { name: /yes, confirm/i })).toBeVisible();
		});

		it('should close the single edit popover when a selection checkbox is clicked', async () => {
			const node = populateNode();
			node.owner = populateUser();
			const loggedUser = populateUser(LOGGED_USER.id);
			const user2 = populateUser();
			const share1 = populateShare(node, node.id, loggedUser);
			const share2 = populateShare(node, node.id, user2);
			share1.permission = SharePermission.ReadWriteAndShare;
			share2.permission = SharePermission.ReadWriteAndShare;
			node.shares = [share1, share2];
			node.permissions.can_share = true;
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const collaboratorsSection = screen.getByTestId('sharing-collaborators-section');
			const editButtons = within(collaboratorsSection).getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.edit
			});
			await user.click(editButtons[1]);
			const viewerSelection = screen.getByTestId(SELECTORS.exclusiveSelectionViewer);
			expect(within(viewerSelection).getByText(/viewer/i)).toBeVisible();
			expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
			const checkboxes = screen.getAllByTestId(ICON_REGEXP.checkboxUnchecked);
			await user.click(checkboxes[1]);
			expect(screen.queryByTestId(SELECTORS.exclusiveSelectionViewer)).not.toBeInTheDocument();
		});
	});
});
