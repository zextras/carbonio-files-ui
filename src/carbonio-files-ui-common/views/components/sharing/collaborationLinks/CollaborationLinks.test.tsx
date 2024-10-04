/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, waitFor } from '@testing-library/react';

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
import { isFile } from '../../../../utils/utils';

describe('Collaboration Link', () => {
	it('should render the section without no collaboration link created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		await waitFor(() =>
			expect(
				within(screen.getByTestId(SELECTORS.collaborationLinkReadShare)).getByRole('button', {
					name: /generate link/i
				})
			).toBeEnabled()
		);
		expect(screen.getByText('Collaboration links')).toBeVisible();
		expect(
			screen.getByText(
				'Internal users will receive the permissions by opening the link. You can always modify granted permissions.'
			)
		).toBeVisible();
		const readAndShareCollaborationLinkContainer = screen.getByTestId(
			SELECTORS.collaborationLinkReadShare
		);
		expect(
			within(readAndShareCollaborationLinkContainer).getByTestId(ICON_REGEXP.shareCanRead)
		).toBeVisible();
		expect(
			within(readAndShareCollaborationLinkContainer).getByText('Read and Share')
		).toBeVisible();
		expect(
			within(readAndShareCollaborationLinkContainer).getByText(
				'Create a link in order to share the item'
			)
		).toBeVisible();
		expect(
			within(readAndShareCollaborationLinkContainer).getByRole('button', { name: /generate link/i })
		).toBeVisible();
		expect(
			within(readAndShareCollaborationLinkContainer).queryByRole('button', {
				name: /revoke/i
			})
		).not.toBeInTheDocument();
		const readWriteAndShareCollaborationLinkContainer = screen.getByTestId(
			SELECTORS.collaborationLinkWriteShare
		);
		expect(
			within(readWriteAndShareCollaborationLinkContainer).getByTestId(ICON_REGEXP.shareCanWrite)
		).toBeVisible();
		expect(
			within(readWriteAndShareCollaborationLinkContainer).getByText('Write and Share')
		).toBeVisible();
		expect(
			within(readWriteAndShareCollaborationLinkContainer).getByText(
				'Create a link in order to share the item'
			)
		).toBeVisible();
		expect(
			within(readWriteAndShareCollaborationLinkContainer).getByRole('button', {
				name: /generate link/i
			})
		).toBeVisible();
		expect(
			within(readWriteAndShareCollaborationLinkContainer).queryByRole('button', {
				name: /revoke/i
			})
		).not.toBeInTheDocument();
	});

	test('starting with ReadAndShare collaboration link and then create ReadWriteAndShare collaboration link', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const readWriteAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadWriteAndShare
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([readAndShareCollaborationLink])
			},
			Mutation: {
				createCollaborationLink: mockCreateCollaborationLink(readWriteAndShareCollaborationLink)
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		await screen.findByText(readAndShareCollaborationLink.url);
		const readWriteAndShareCollaborationLinkContainer = screen.getByTestId(
			SELECTORS.collaborationLinkWriteShare
		);
		const readWriteAndShareGenerateButton = within(
			readWriteAndShareCollaborationLinkContainer
		).getByRole('button', {
			name: /generate link/i
		});
		await user.click(readWriteAndShareGenerateButton);
		expect(await screen.findByText(readWriteAndShareCollaborationLink.url)).toBeVisible();
		const snackbar = await screen.findByText(/New Collaboration Link generated/i);
		expect(snackbar).toBeVisible();
	});

	test('starting with ReadWriteAndShare collaboration link and then create ReadAndShare collaboration link', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const readWriteAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadWriteAndShare
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([readWriteAndShareCollaborationLink])
			},
			Mutation: {
				createCollaborationLink: mockCreateCollaborationLink(readAndShareCollaborationLink)
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		await screen.findByText(readWriteAndShareCollaborationLink.url);
		const readAndShareCollaborationLinkContainer = screen.getByTestId(
			SELECTORS.collaborationLinkReadShare
		);
		const readAndShareGenerateButton = within(readAndShareCollaborationLinkContainer).getByRole(
			'button',
			{
				name: /generate link/i
			}
		);
		await user.click(readAndShareGenerateButton);
		expect(await screen.findByText(readAndShareCollaborationLink.url)).toBeVisible();
		const snackbar = await screen.findByText(/New Collaboration Link generated/i);
		expect(snackbar).toBeVisible();
	});

	test('starting with ReadAndShare collaboration link and then delete it', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([readAndShareCollaborationLink])
			},
			Mutation: {
				deleteCollaborationLinks: mockDeleteCollaborationLinks([readAndShareCollaborationLink.id])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		const urlElement = await screen.findByText(readAndShareCollaborationLink.url);
		const readAndShareCollaborationLinkContainer = screen.getByTestId(
			SELECTORS.collaborationLinkReadShare
		);
		const readAndShareRevokeButton = within(readAndShareCollaborationLinkContainer).getByRole(
			'button',
			{
				name: /revoke/i
			}
		);
		await user.click(readAndShareRevokeButton);

		const modalTitle = await screen.findByText(`Revoke ${node.name} collaboration link`);

		expect(modalTitle).toBeInTheDocument();

		const modalContent = await screen.findByText(
			`By revoking this link, you are blocking the possibility to create new shares with it. Everyone who has already used the collaboration link will keep the access to the item.`
		);
		act(() => {
			// run timers of modal
			jest.runOnlyPendingTimers();
		});

		expect(modalContent).toBeVisible();
		const revokeButton = within(screen.getByTestId(SELECTORS.modal)).getByRole('button', {
			name: /revoke/i
		});
		expect(revokeButton).toBeVisible();
		await user.click(revokeButton);
		await waitFor(() =>
			expect(screen.queryByText(readAndShareCollaborationLink.url)).not.toBeInTheDocument()
		);
		expect(urlElement).not.toBeInTheDocument();
	});

	test('starting with ReadWriteAndShare collaboration link and then delete it', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readWriteAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadWriteAndShare
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([readWriteAndShareCollaborationLink])
			},
			Mutation: {
				deleteCollaborationLinks: mockDeleteCollaborationLinks([
					readWriteAndShareCollaborationLink.id
				])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		const urlElement = await screen.findByText(readWriteAndShareCollaborationLink.url);
		const readWriteAndShareCollaborationLinkContainer = screen.getByTestId(
			SELECTORS.collaborationLinkWriteShare
		);
		const readWriteAndShareRevokeButton = within(
			readWriteAndShareCollaborationLinkContainer
		).getByRole('button', {
			name: /revoke/i
		});
		await user.click(readWriteAndShareRevokeButton);

		const modalTitle = await screen.findByText(`Revoke ${node.name} collaboration link`);

		expect(modalTitle).toBeInTheDocument();

		const modalContent = await screen.findByText(
			`By revoking this link, you are blocking the possibility to create new shares with it. Everyone who has already used the collaboration link will keep the access to the item.`
		);
		expect(modalContent).toBeInTheDocument();
		act(() => {
			// run timers of modal
			jest.runOnlyPendingTimers();
		});

		expect(modalContent).toBeVisible();
		const revokeButton = within(screen.getByTestId(SELECTORS.modal)).getByRole('button', {
			name: /revoke/i
		});
		expect(revokeButton).toBeVisible();
		await user.click(revokeButton);
		await waitFor(() =>
			expect(screen.queryByText(readWriteAndShareCollaborationLink.url)).not.toBeInTheDocument()
		);
		expect(urlElement).not.toBeInTheDocument();
	});

	test('starting with ReadAndShare collaboration link, click on url chip copy the url to clipboard and show an info snackbar', async () => {
		const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');

		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([readAndShareCollaborationLink])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		const urlElement = await screen.findByText(readAndShareCollaborationLink.url);
		await user.click(urlElement);
		expect(copyToClipboardFn).toBeCalledWith(readAndShareCollaborationLink.url);

		const snackbar = await screen.findByText(/Collaboration Link copied/i);
		expect(snackbar).toBeVisible();
	});

	test('If can_write is false than ReadWriteAndShare have to be hidden also if returned by query', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = false;
		node.permissions.can_write_file = false;
		const readAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadAndShare
		);
		const readWriteAndShareCollaborationLink = populateCollaborationLink(
			node,
			SharePermission.ReadWriteAndShare
		);
		const mocks = {
			Query: {
				getCollaborationLinks: mockGetCollaborationLinks([
					readAndShareCollaborationLink,
					readWriteAndShareCollaborationLink
				])
			}
		} satisfies Partial<Resolvers>;
		setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		const readAndShareUrlElement = await screen.findByText(readAndShareCollaborationLink.url);
		expect(readAndShareUrlElement).toBeVisible();
		const readWriteAndShareUrlElement = screen.queryByText(readWriteAndShareCollaborationLink.url);
		expect(readWriteAndShareUrlElement).not.toBeInTheDocument();
	});
});
