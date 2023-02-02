/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitFor, within } from '@testing-library/react';

import { populateCollaborationLink, populateNode } from '../../../../mocks/mockUtils';
import { SharePermission } from '../../../../types/graphql/types';
import {
	mockCreateCollaborationLink,
	mockDeleteCollaborationLinks,
	mockGetNodeCollaborationLinks
} from '../../../../utils/mockUtils';
import { setup } from '../../../../utils/testUtils';
import * as moduleUtils from '../../../../utils/utils';
import { isFile } from '../../../../utils/utils';
import { CollaborationLinks } from './CollaborationLinks';

describe('Collaboration Link', () => {
	test('no collaboration Links created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		const mocks = [mockGetNodeCollaborationLinks({ node_id: node.id }, node, [])];
		setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				nodeTypename={node.__typename}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		const readAndShareCollaborationLinkContainer = await screen.findByTestId(
			'read-share-collaboration-link-container'
		);
		const readAndShareGenerateButton = within(readAndShareCollaborationLinkContainer).getByRole(
			'button',
			{
				name: /generate link/i
			}
		);
		await waitFor(() => expect(readAndShareGenerateButton).not.toHaveAttribute('disabled', ''));
		const collaborationLinkContainer = screen.getByTestId('collaboration-link-container');
		expect(within(collaborationLinkContainer).getByText('Collaboration Links')).toBeVisible();
		expect(
			within(collaborationLinkContainer).getByText(
				'Internal users will receive the permissions by opening the link. You can always modify granted permissions.'
			)
		).toBeVisible();
		expect(
			within(readAndShareCollaborationLinkContainer).getByTestId('icon: EyeOutline')
		).toBeVisible();
		expect(
			within(readAndShareCollaborationLinkContainer).getByText('Read and Share')
		).toBeVisible();
		expect(
			within(readAndShareCollaborationLinkContainer).getByText(
				'Create a link in order to share the node'
			)
		).toBeVisible();
		expect(readAndShareGenerateButton).toBeVisible();
		const readAndShareRevokeButton = within(readAndShareCollaborationLinkContainer).queryByRole(
			'button',
			{
				name: /revoke/i
			}
		);
		expect(readAndShareRevokeButton).not.toBeInTheDocument();

		const readWriteAndShareCollaborationLinkContainer = screen.getByTestId(
			'read-write-share-collaboration-link-container'
		);
		expect(
			within(readWriteAndShareCollaborationLinkContainer).getByTestId('icon: Edit2Outline')
		).toBeVisible();
		expect(
			within(readWriteAndShareCollaborationLinkContainer).getByText('Write and Share')
		).toBeVisible();
		expect(
			within(readWriteAndShareCollaborationLinkContainer).getByText(
				'Create a link in order to share the node'
			)
		).toBeVisible();
		const readWriteAndShareGenerateButton = within(
			readWriteAndShareCollaborationLinkContainer
		).getByRole('button', {
			name: /generate link/i
		});
		expect(readWriteAndShareGenerateButton).toBeVisible();
		const readWriteAndShareRevokeButton = within(
			readWriteAndShareCollaborationLinkContainer
		).queryByRole('button', {
			name: /revoke/i
		});
		expect(readWriteAndShareRevokeButton).not.toBeInTheDocument();
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
		const mocks = [
			mockGetNodeCollaborationLinks({ node_id: node.id }, node, [readAndShareCollaborationLink]),
			mockCreateCollaborationLink(
				{ node_id: node.id, permission: SharePermission.ReadWriteAndShare },
				readWriteAndShareCollaborationLink
			)
		];
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				nodeTypename={node.__typename}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		await screen.findByText(readAndShareCollaborationLink.url);
		const readWriteAndShareCollaborationLinkContainer = screen.getByTestId(
			'read-write-share-collaboration-link-container'
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
		const mocks = [
			mockGetNodeCollaborationLinks({ node_id: node.id }, node, [
				readWriteAndShareCollaborationLink
			]),
			mockCreateCollaborationLink(
				{ node_id: node.id, permission: SharePermission.ReadAndShare },
				readAndShareCollaborationLink
			)
		];
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				nodeTypename={node.__typename}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		await screen.findByText(readWriteAndShareCollaborationLink.url);
		const readAndShareCollaborationLinkContainer = screen.getByTestId(
			'read-share-collaboration-link-container'
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
		const mocks = [
			mockGetNodeCollaborationLinks({ node_id: node.id }, node, [readAndShareCollaborationLink]),
			mockDeleteCollaborationLinks({ collaboration_link_ids: [readAndShareCollaborationLink.id] }, [
				readAndShareCollaborationLink.id
			])
		];
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				nodeTypename={node.__typename}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		const urlElement = await screen.findByText(readAndShareCollaborationLink.url);
		const readAndShareCollaborationLinkContainer = screen.getByTestId(
			'read-share-collaboration-link-container'
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
			`By revoking this link, you are blocking the possibility to create new shares with it. Everyone who has already used the collaboration link will keep the access to the node.`
		);
		act(() => {
			// run timers of modal
			jest.runOnlyPendingTimers();
		});

		expect(modalContent).toBeVisible();
		const revokeButton = within(screen.getByTestId('modal')).getByRole('button', {
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
		const mocks = [
			mockGetNodeCollaborationLinks({ node_id: node.id }, node, [
				readWriteAndShareCollaborationLink
			]),
			mockDeleteCollaborationLinks(
				{ collaboration_link_ids: [readWriteAndShareCollaborationLink.id] },
				[readWriteAndShareCollaborationLink.id]
			)
		];
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				nodeTypename={node.__typename}
				canWrite={
					isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
				}
			/>,
			{ mocks }
		);
		const urlElement = await screen.findByText(readWriteAndShareCollaborationLink.url);
		const readWriteAndShareCollaborationLinkContainer = screen.getByTestId(
			'read-write-share-collaboration-link-container'
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
			`By revoking this link, you are blocking the possibility to create new shares with it. Everyone who has already used the collaboration link will keep the access to the node.`
		);
		expect(modalContent).toBeInTheDocument();
		act(() => {
			// run timers of modal
			jest.runOnlyPendingTimers();
		});

		expect(modalContent).toBeVisible();
		const revokeButton = within(screen.getByTestId('modal')).getByRole('button', {
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
		const mocks = [
			mockGetNodeCollaborationLinks({ node_id: node.id }, node, [readAndShareCollaborationLink])
		];
		const { user } = setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				nodeTypename={node.__typename}
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
		const mocks = [
			// Simulating that the BE wrongly return both the link
			mockGetNodeCollaborationLinks({ node_id: node.id }, node, [
				readAndShareCollaborationLink,
				readWriteAndShareCollaborationLink
			])
		];
		setup(
			<CollaborationLinks
				nodeId={node.id}
				nodeName={node.name}
				nodeTypename={node.__typename}
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
