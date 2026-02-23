/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act } from '@testing-library/react';
import { forEach } from 'lodash';

import { CollaborationLinks } from './CollaborationLinks';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import { populateCollaborationLink, populateNode } from '../../../../mocks/mockUtils';
import { setup, screen, within } from '../../../../tests/utils';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import { SharePermission } from '../../../../types/graphql/types';
import {
	mockCreateCollaborationLink,
	mockDeleteCollaborationLinks,
	mockGetCollaborationLinks
} from '../../../../utils/resolverMocks';
import * as moduleUtils from '../../../../utils/utils';

describe('Collaboration Link', () => {
	it('should render the section without collaboration links created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />, {
			mocks
		});

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getByText('Collaboration links')).toBeVisible();
		expect(
			screen.getByText(
				'Internal users will receive the permissions by opening the link. You can always modify granted permissions.'
			)
		).toBeVisible();
		expect(screen.getByText(/choose permissions to generate link/i)).toBeVisible();
		const button = screen.getByRole('button', {
			name: /generate link/i
		});
		expect(button).toBeVisible();
		expect(button).toBeDisabled();
		await user.hover(button);
		// tooltip of the disabled button
		expect(await screen.findByText('Choose permissions to generate link')).toBeVisible();
	});

	it('should enable generate link button when the user chooses a permission in the select', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />, {
			mocks
		});

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		await user.click(screen.getByText(/choose permissions to generate link/i));
		const dropdown = screen.getByTestId(SELECTORS.dropdownList);
		expect(within(dropdown).getByText('View')).toBeVisible();
		expect(within(dropdown).getByText('Edit')).toBeVisible();
		expect(within(dropdown).getByText('View and manage sharing')).toBeVisible();
		expect(within(dropdown).getByText('Edit and manage sharing')).toBeVisible();
		await user.click(within(dropdown).getByText('View'));
		expect(
			screen.getByRole('button', {
				name: /generate link/i
			})
		).toBeEnabled();
	});

	describe('Generation of collaboration link', () => {
		it.each([
			[
				'View',
				SharePermission.ReadOnly,
				SELECTORS.collaborationLinkReadOnly,
				[ICON_REGEXP.eyeCollaborationLinkIcon]
			],
			[
				'Edit',
				SharePermission.ReadAndWrite,
				SELECTORS.collaborationLinkWrite,
				[ICON_REGEXP.editCollaborationLinkIcon]
			],
			[
				'View and manage sharing',
				SharePermission.ReadAndShare,
				SELECTORS.collaborationLinkReadShare,
				[ICON_REGEXP.eyeCollaborationLinkIcon, ICON_REGEXP.shareCollaborationLinkIcon]
			],
			[
				'Edit and manage sharing',
				SharePermission.ReadWriteAndShare,
				SELECTORS.collaborationLinkWriteShare,
				[ICON_REGEXP.editCollaborationLinkIcon, ICON_REGEXP.shareCollaborationLinkIcon]
			]
		])(
			'should generate a collaboration link with %s permission',
			async (permissionText, sharePermission, dataTestId, icons) => {
				const node = populateNode();
				node.permissions.can_share = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_write_file = true;
				const collaborationLink = populateCollaborationLink(node, sharePermission);
				const mocks = {
					Query: {
						getCollaborationLinks: mockGetCollaborationLinks([])
					},
					Mutation: {
						createCollaborationLink: mockCreateCollaborationLink(collaborationLink)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />,
					{
						mocks
					}
				);

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const select = screen.getByText(/choose permissions to generate link/i);
				await user.click(select);
				await user.click(
					within(screen.getByTestId(SELECTORS.dropdownList)).getByText(permissionText)
				);
				await user.click(
					screen.getByRole('button', {
						name: /generate link/i
					})
				);
				const snackbar = screen.getByTestId(SELECTORS.snackbar);
				expect(within(snackbar).getByText(/New Collaboration link generated/i)).toBeVisible();
				const section = screen.getByTestId(dataTestId);
				expect(within(section).getByText(permissionText)).toBeVisible();
				const chip = screen.getByTestId(SELECTORS.chip);
				expect(within(chip).getByText(collaborationLink.url)).toBeVisible();
				forEach(icons, (icon) => {
					expect(within(chip).getByTestId(icon)).toBeVisible();
				});
				// should render the tooltip because the option is disabled in select
				await user.click(select);
				await user.hover(
					within(screen.getByTestId(SELECTORS.dropdownList)).getByText(permissionText)
				);
				expect(
					await screen.findByText(/This type of link has already been created/i)
				).toBeVisible();
			}
		);

		it('should not select any options in Select when the user generates a collaboration link', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
			const mocks = {
				Query: {
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					createCollaborationLink: mockCreateCollaborationLink(readOnlyCollaborationLink)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />,
				{
					mocks
				}
			);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(screen.getByText(/choose permissions to generate link/i));
			await user.click(screen.getByText('View'));
			await user.click(
				screen.getByRole('button', {
					name: /generate link/i
				})
			);
			const section = screen.getByTestId(SELECTORS.collaborationLinkSelectLabel);
			expect(within(section).queryByText(/view/i)).not.toBeInTheDocument();
		});

		it('should disable the generate link button when the user generates a collaboration link', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
			const mocks = {
				Query: {
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					createCollaborationLink: mockCreateCollaborationLink(readOnlyCollaborationLink)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />,
				{
					mocks
				}
			);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(screen.getByText(/choose permissions to generate link/i));
			await user.click(screen.getByText('View'));
			const generateButton = screen.getByRole('button', {
				name: /generate link/i
			});
			await user.click(generateButton);
			expect(generateButton).toBeDisabled();
		});
	});

	it('should disable the select and the generate link button if all the types of collaboration links are created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
		const readWriteAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadWriteAndShare
		);
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const readAndWriteCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndWrite
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([
					readOnlyCollaborationLink,
					readWriteAndShareCollaborationLink,
					readAndShareCollaborationLink,
					readAndWriteCollaborationLink
				])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />, {
			mocks
		});

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getByText(readOnlyCollaborationLink.url)).toBeVisible();
		expect(screen.getByText(readAndWriteCollaborationLink.url)).toBeVisible();
		expect(screen.getByText(readAndShareCollaborationLink.url)).toBeVisible();
		expect(screen.getByText(readWriteAndShareCollaborationLink.url)).toBeVisible();
		const generateButton = screen.getByRole('button', {
			name: /generate link/i
		});
		expect(generateButton).toBeDisabled();
		// the dropdown does not open because the select is disabled
		await user.click(screen.getByText(/Choose permissions to generate link/i));
		expect(screen.queryByTestId(SELECTORS.dropdownList)).not.toBeInTheDocument();
		// tooltip of the generate link button disabled
		await user.hover(generateButton);
		expect(
			await screen.findByText(
				/You've reached the maximum number of links. Revoke one to create a new one./i
			)
		).toBeVisible();
	});

	it('should render the tooltip on select if all the types of collaboration links are created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
		const readWriteAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadWriteAndShare
		);
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const readAndWriteCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndWrite
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([
					readOnlyCollaborationLink,
					readWriteAndShareCollaborationLink,
					readAndShareCollaborationLink,
					readAndWriteCollaborationLink
				])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />, {
			mocks
		});

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		await user.hover(screen.getByText(/Choose permissions to generate link/i));
		expect(
			await screen.findByText(
				/You've reached the maximum number of links. Revoke one to create a new one./i
			)
		).toBeVisible();
	});

	it('should not render the tooltip on select if not all the types of collaboration links are created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
		const readWriteAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadWriteAndShare
		);
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([
					readOnlyCollaborationLink,
					readWriteAndShareCollaborationLink,
					readAndShareCollaborationLink
				])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />, {
			mocks
		});

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		await user.hover(screen.getByText(/Choose permissions to generate link/i));
		act(() => {
			// run timers of tooltip
			vi.advanceTimersToNextTimer();
		});
		expect(
			screen.queryByText(
				/You've reached the maximum number of links. Revoke one to create a new one./i
			)
		).not.toBeInTheDocument();
	});

	describe('Revoke collaboration link', () => {
		it('should revoke only the collaboration link with view permission', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
			const readWriteAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadWriteAndShare
			);
			const readAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndShare
			);
			const readAndWriteCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndWrite
			);
			const mocks = {
				Query: {
					getCollaborationLinks: mockGetCollaborationLinks([
						readOnlyCollaborationLink,
						readWriteAndShareCollaborationLink,
						readAndShareCollaborationLink,
						readAndWriteCollaborationLink
					])
				},
				Mutation: {
					deleteCollaborationLinks: mockDeleteCollaborationLinks([readOnlyCollaborationLink.id])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />,
				{
					mocks
				}
			);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(
				within(screen.getByTestId(SELECTORS.collaborationLinkReadOnly)).getByRole('button', {
					name: /revoke/i
				})
			);
			act(() => {
				// run timers of modal
				vi.runOnlyPendingTimers();
			});
			const modal = screen.getByTestId(SELECTORS.modal);
			expect(within(modal).getByText(`Revoke ${node.name} collaboration link`)).toBeVisible();
			expect(
				within(modal).getByText(
					`By revoking this link, you are blocking the possibility to create new shares with it. Everyone who has already used the collaboration link will keep the access to the item.`
				)
			).toBeVisible();
			const revokeButton = within(modal).getByRole('button', { name: /revoke/i });
			expect(revokeButton).toBeVisible();
			await user.click(revokeButton);
			expect(screen.queryByText(readOnlyCollaborationLink.url)).not.toBeInTheDocument();
			expect(screen.getByText(readAndWriteCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readAndShareCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readWriteAndShareCollaborationLink.url)).toBeVisible();
		});

		it('should revoke only the collaboration link with write and share permission', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
			const readWriteAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadWriteAndShare
			);
			const readAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndShare
			);
			const readAndWriteCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndWrite
			);
			const mocks = {
				Query: {
					getCollaborationLinks: mockGetCollaborationLinks([
						readOnlyCollaborationLink,
						readWriteAndShareCollaborationLink,
						readAndShareCollaborationLink,
						readAndWriteCollaborationLink
					])
				},
				Mutation: {
					deleteCollaborationLinks: mockDeleteCollaborationLinks([
						readWriteAndShareCollaborationLink.id
					])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />,
				{
					mocks
				}
			);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(
				within(screen.getByTestId(SELECTORS.collaborationLinkWriteShare)).getByRole('button', {
					name: /revoke/i
				})
			);
			act(() => {
				// run timers of modal
				vi.runOnlyPendingTimers();
			});
			const modal = screen.getByTestId(SELECTORS.modal);
			await user.click(within(modal).getByRole('button', { name: /revoke/i }));
			expect(screen.queryByText(readWriteAndShareCollaborationLink.url)).not.toBeInTheDocument();
			expect(screen.getByText(readAndWriteCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readAndShareCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readOnlyCollaborationLink.url)).toBeVisible();
		});

		it('should revoke only the collaboration link with write and share permission', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
			const readWriteAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadWriteAndShare
			);
			const readAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndShare
			);
			const readAndWriteCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndWrite
			);
			const mocks = {
				Query: {
					getCollaborationLinks: mockGetCollaborationLinks([
						readOnlyCollaborationLink,
						readWriteAndShareCollaborationLink,
						readAndShareCollaborationLink,
						readAndWriteCollaborationLink
					])
				},
				Mutation: {
					deleteCollaborationLinks: mockDeleteCollaborationLinks([readAndShareCollaborationLink.id])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />,
				{
					mocks
				}
			);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(
				within(screen.getByTestId(SELECTORS.collaborationLinkReadShare)).getByRole('button', {
					name: /revoke/i
				})
			);
			act(() => {
				// run timers of modal
				vi.runOnlyPendingTimers();
			});
			const modal = screen.getByTestId(SELECTORS.modal);
			await user.click(within(modal).getByRole('button', { name: /revoke/i }));
			expect(screen.queryByText(readAndShareCollaborationLink.url)).not.toBeInTheDocument();
			expect(screen.getByText(readAndWriteCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readWriteAndShareCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readOnlyCollaborationLink.url)).toBeVisible();
		});

		it('should revoke only the collaboration link with write and share permission', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			const readOnlyCollaborationLink = populateCollaborationLink(node, SharePermission.ReadOnly);
			const readWriteAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadWriteAndShare
			);
			const readAndShareCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndShare
			);
			const readAndWriteCollaborationLink = populateCollaborationLink(
				node,
				SharePermission.ReadAndWrite
			);
			const mocks = {
				Query: {
					getCollaborationLinks: mockGetCollaborationLinks([
						readOnlyCollaborationLink,
						readWriteAndShareCollaborationLink,
						readAndShareCollaborationLink,
						readAndWriteCollaborationLink
					])
				},
				Mutation: {
					deleteCollaborationLinks: mockDeleteCollaborationLinks([readAndWriteCollaborationLink.id])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />,
				{
					mocks
				}
			);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(
				within(screen.getByTestId(SELECTORS.collaborationLinkWrite)).getByRole('button', {
					name: /revoke/i
				})
			);
			act(() => {
				// run timers of modal
				vi.runOnlyPendingTimers();
			});
			const modal = screen.getByTestId(SELECTORS.modal);
			await user.click(within(modal).getByRole('button', { name: /revoke/i }));
			expect(screen.queryByText(readAndWriteCollaborationLink.url)).not.toBeInTheDocument();
			expect(screen.getByText(readAndShareCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readWriteAndShareCollaborationLink.url)).toBeVisible();
			expect(screen.getByText(readOnlyCollaborationLink.url)).toBeVisible();
		});
	});

	it.each([
		SharePermission.ReadAndShare,
		SharePermission.ReadAndWrite,
		SharePermission.ReadWriteAndShare,
		SharePermission.ReadOnly
	])('should copy the url if the user clicks on the chip', async (permission) => {
		const copyToClipboardFn = vi.spyOn(moduleUtils, 'copyToClipboard');
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const collaborationLink = populateCollaborationLink(node, permission);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([collaborationLink])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite />, {
			mocks
		});

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		await user.click(screen.getByText(collaborationLink.url));
		expect(copyToClipboardFn).toHaveBeenCalledWith(collaborationLink.url);
		expect(await screen.findByText(/Collaboration Link copied/i)).toBeVisible();
	});

	it.each(['Edit', 'Edit and manage sharing'])(
		'should disable the Edit and Edit and manage sharing options if canWrite is false',
		async (permission) => {
			const node = populateNode();
			node.permissions.can_share = true;
			const mocks = {
				Query: {
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<CollaborationLinks nodeId={node.id} nodeName={node.name} canWrite={false} />,
				{
					mocks
				}
			);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(screen.getByText(/choose permissions to generate link/i));
			const dropdown = screen.getByTestId(SELECTORS.dropdownList);
			await user.hover(within(dropdown).getByText(permission));
			expect(
				await screen.findByText(
					"You are not allowed to create this collaboration link because you don't have edit permission"
				)
			).toBeVisible();
		}
	);
});
