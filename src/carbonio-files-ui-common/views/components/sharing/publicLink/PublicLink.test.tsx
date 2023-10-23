/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { PublicLink } from './PublicLink';
import { populateLink, populateNode } from '../../../../mocks/mockUtils';
import { Node } from '../../../../types/common';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import { mockCreateLink, mockGetLinks } from '../../../../utils/resolverMocks';
import { getFirstOfNextMonth, setup } from '../../../../utils/testUtils';
import { formatDate, initExpirationDate } from '../../../../utils/utils';
import * as moduleUtils from '../../../../utils/utils';

describe('Public Link', () => {
	test.each([['File'], ['Folder']])(
		'should render the link section with title and description if canShare is true',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const linkName = 'Link name';
			const linkDescription = 'Link description';
			setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={linkName}
					linkDescription={linkDescription}
				/>
			);
			expect(screen.getByText(`${linkName}s`)).toBeVisible();
			expect(screen.getByText(linkDescription)).toBeVisible();
			expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'should not render the link section if canShare is false',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const linkName = 'Link name';
			const linkDescription = 'Link description';
			setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare={false}
					linkName={linkName}
					linkDescription={linkDescription}
				/>
			);
			expect(screen.queryByText(`${linkName}s`)).not.toBeInTheDocument();
			expect(screen.queryByText(linkDescription)).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /add link/i })).not.toBeInTheDocument();
		}
	);

	test.each([['File'], ['Folder']])(
		'should render the description and expiration date input fields',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={'Link name'}
					linkDescription={'Link description'}
				/>
			);
			const addLinkBtn = screen.getByRole('button', { name: /add link/i });
			expect(addLinkBtn).toBeVisible();
			await user.click(addLinkBtn);
			expect(screen.getByRole('textbox', { name: /link's description/i })).toBeVisible();
			expect(screen.getByRole('textbox', { name: /expiration date/i })).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'should render undo and generate link buttons when a link is created',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				},
				Mutation: {
					createLink: mockCreateLink(link)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={'Link name'}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			const addLinkBtn = screen.getByRole('button', { name: /add link/i });
			expect(addLinkBtn).toBeVisible();
			await user.click(addLinkBtn);
			expect(screen.getByRole('button', { name: /undo/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /generate link/i })).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'should render revoke and edit buttons when a link is generated',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				},
				Mutation: {
					createLink: mockCreateLink(link)
				}
			} satisfies Partial<Resolvers>;
			const linkName = 'Link name';
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={linkName}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			await user.click(screen.getByRole('button', { name: /add link/i }));
			expect(screen.queryByRole('button', { name: /add link/i })).not.toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			expect(await screen.findByText(link.url as string)).toBeVisible();
			expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /revoke/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /edit/i })).toBeVisible();
			const snackbar = await screen.findByText(`New ${linkName} generated`);
			expect(snackbar).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'should render has no expiration date if expiration date is not set',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			link.expires_at = null;
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={'Link name'}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			await screen.findByText(link.url as string);
			expect(screen.getByText(/has no expiration date/i)).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'should render the expiration date if expiration date is set',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			const firstOfNextMonth = getFirstOfNextMonth();
			const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
			link.expires_at = expiresAt?.getTime();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={'Link name'}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			await screen.findByText(link.url as string);
			const expiresOnDate = formatDate(
				new Date(
					firstOfNextMonth.getFullYear(),
					firstOfNextMonth.getMonth(),
					firstOfNextMonth.getDate(),
					23,
					59
				),
				'DD/MM/YY HH:mm'
			);
			const expiresOnRegexp = RegExp(`expires on: ${expiresOnDate}`, 'i');
			expect(screen.getByText(expiresOnRegexp)).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'should render the message link has expired if the link is expired',
		async (nodeType) => {
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			// set the date to yesterday at 00:00
			const date = new Date();
			date.setDate(date.getDate() - 1);
			date.setHours(0, 0, 0, 0);
			const expiresAt = initExpirationDate(date) as Date;
			link.expires_at = expiresAt?.getTime();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={'Link name'}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			await screen.findByText(link.url as string);
			const expiresOnDate = formatDate(
				new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59),
				'DD/MM/YY HH:mm'
			);
			const expiresOnRegexp = RegExp(`this link has expired on: ${expiresOnDate}`, 'i');
			expect(screen.getByText(expiresOnRegexp)).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'can copy the link to clipboard if there is no expiration',
		async (nodeType) => {
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			link.expires_at = null;
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const linkName = 'Link name';
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={linkName}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			const urlElement = await screen.findByText(link.url as string);
			await user.click(urlElement);
			expect(copyToClipboardFn).toBeCalledWith(link.url);
			const snackbar = await screen.findByText(`${linkName} copied`);
			expect(snackbar).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'can copy the link to clipboard if it is not expired',
		async (nodeType) => {
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			const firstOfNextMonth = getFirstOfNextMonth();
			const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
			link.expires_at = expiresAt?.getTime();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const linkName = 'Link name';
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={linkName}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			const urlElement = await screen.findByText(link.url as string);
			await user.click(urlElement);
			expect(copyToClipboardFn).toBeCalledWith(link.url);

			const snackbar = await screen.findByText(`${linkName} copied`);
			expect(snackbar).toBeVisible();
		}
	);

	test.each([['File'], ['Folder']])(
		'cannot copy the link to clipboard if it is expired',
		async (nodeType) => {
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const node = populateNode(nodeType as Node['__typename']);
			const link = populateLink(node);
			const date = new Date();
			date.setDate(date.getDate() - 1);
			date.setHours(0, 0, 0, 0);
			const expiresAt = initExpirationDate(date) as Date;
			link.expires_at = expiresAt?.getTime();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					canShare
					linkName={'Link name'}
					linkDescription={'Link description'}
				/>,
				{ mocks }
			);
			const urlElement = await screen.findByText(link.url as string);
			await user.click(urlElement);
			expect(copyToClipboardFn).not.toBeCalledWith(link.url);
		}
	);
});
