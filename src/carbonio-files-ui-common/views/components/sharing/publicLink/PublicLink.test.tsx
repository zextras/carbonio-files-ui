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

describe.each<Node['__typename']>(['File', 'Folder'])('Public Link', (nodeType) => {
	const node = populateNode(nodeType);
	test('should render the link section with title and description if canShare is true', async () => {
		const linkName = 'Link name';
		const linkTitle = 'Link title';
		const linkDescription = 'Link description';
		setup(
			<PublicLink
				nodeId={node.id}
				nodeName={node.name}
				linkName={linkName}
				linkTitle={linkTitle}
				linkDescription={linkDescription}
			/>
		);
		expect(screen.getByText(linkTitle)).toBeVisible();
		expect(screen.getByText(linkDescription)).toBeVisible();
		expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
	});

	describe('On add', () => {
		test('should render the description and expiration date input fields', async () => {
			const linkTitle = 'Link title';
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					linkTitle={linkTitle}
					linkName={'Link name'}
					linkDescription={'Link description'}
				/>
			);
			const addLinkBtn = screen.getByRole('button', { name: /add link/i });
			expect(addLinkBtn).toBeVisible();
			await user.click(addLinkBtn);
			expect(screen.getByRole('textbox', { name: /link's description/i })).toBeVisible();
			expect(screen.getByRole('textbox', { name: /expiration date/i })).toBeVisible();
		});

		test('should render undo and generate link buttons when a link is created', async () => {
			const linkTitle = 'Link title';
			const linkName = 'Link name';
			const linkDescription = 'Link description';
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
					linkTitle={linkTitle}
					linkName={linkName}
					linkDescription={linkDescription}
				/>,
				{ mocks }
			);
			const addLinkBtn = screen.getByRole('button', { name: /add link/i });
			expect(addLinkBtn).toBeVisible();
			await user.click(addLinkBtn);
			expect(screen.getByRole('button', { name: /undo/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /generate link/i })).toBeVisible();
		});

		test('should render revoke and edit buttons when a link is generated', async () => {
			const linkTitle = 'Link title';
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
					linkTitle={linkTitle}
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
		});
	});

	test('should render has no expiration date if expiration date is not set', async () => {
		const linkTitle = 'Link title';
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
				linkTitle={linkTitle}
				linkName={'Link name'}
				linkDescription={'Link description'}
			/>,
			{ mocks }
		);
		await screen.findByText(link.url as string);
		expect(screen.getByText(/has no expiration date/i)).toBeVisible();
	});

	test('should render the expiration date if expiration date is set', async () => {
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
				linkTitle={'Link title'}
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
	});

	test('should render the message link has expired if the link is expired', async () => {
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
				linkTitle={'Link title'}
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
	});

	test('can copy the link to clipboard if there is no expiration', async () => {
		const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
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
				linkTitle={'Link title'}
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
	});

	test('can copy the link to clipboard if it is not expired', async () => {
		const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
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
				linkTitle={'Link title'}
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
	});

	test('cannot copy the link to clipboard if it is expired', async () => {
		const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
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
				linkTitle={'Link title'}
				linkName={'Link name'}
				linkDescription={'Link description'}
			/>,
			{ mocks }
		);
		const urlElement = await screen.findByText(link.url as string);
		await user.click(urlElement);
		expect(copyToClipboardFn).not.toBeCalledWith(link.url);
	});
});
