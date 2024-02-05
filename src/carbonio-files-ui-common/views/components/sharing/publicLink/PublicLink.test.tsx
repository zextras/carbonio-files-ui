/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';

import { PublicLink } from './PublicLink';
import { ICON_REGEXP } from '../../../../constants/test';
import { populateLink, populateLinks, populateNode } from '../../../../mocks/mockUtils';
import { Node } from '../../../../types/common';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import {
	mockCreateLink,
	mockDeleteLink,
	mockErrorResolver,
	mockGetLinks,
	mockUpdateLink
} from '../../../../utils/resolverMocks';
import {
	generateError,
	getFirstOfNextMonth,
	screen,
	setup,
	within
} from '../../../../utils/testUtils';
import { formatDate, initExpirationDate } from '../../../../utils/utils';
import * as moduleUtils from '../../../../utils/utils';

const getDayBefore = (): number | undefined => {
	const date = new Date();
	date.setDate(date.getDate() - 1);
	date.setHours(0, 0, 0, 0);
	return initExpirationDate(date)?.getTime();
};

describe.each<Node['__typename']>(['File', 'Folder'])('Public Link', (nodeType) => {
	test('should render the link section with title and description', async () => {
		const node = populateNode(nodeType);
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
			const node = populateNode(nodeType);
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
			const node = populateNode(nodeType);
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
			const node = populateNode(nodeType);
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

		it('should render maximum length error when the description length is greater than 300 characters', async () => {
			const node = populateNode(nodeType);
			const linkName = 'Link name';
			const linkTitle = 'Link title';
			const linkDescription = 'Link description';
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					linkName={linkName}
					linkTitle={linkTitle}
					linkDescription={linkDescription}
				/>
			);
			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.type(
				screen.getByRole('textbox', { name: /link's description/i }),
				faker.string.alpha(301)
			);
			expect(screen.getByText(/Maximum length allowed is 300 characters/i)).toBeVisible();
		});
	});

	it('should render limit reached message when the user has created 50 links', async () => {
		const node = populateNode(nodeType);
		const linkTitle = 'Link title';
		const linkName = 'Link name';
		const linkDescription = 'Link description';
		const links = populateLinks(node, 50);
		const mocks = {
			Query: {
				getLinks: mockGetLinks(links)
			}
		} satisfies Partial<Resolvers>;
		setup(
			<PublicLink
				nodeId={node.id}
				nodeName={node.name}
				linkTitle={linkTitle}
				linkName={linkName}
				linkDescription={linkDescription}
			/>,
			{ mocks }
		);
		await screen.findAllByText(links[0].url as string);
		expect(screen.getByText(/The maximum amount of public links has been reached/i)).toBeVisible();
		expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /generate link/i })).not.toBeInTheDocument();
	});

	describe('Undo button', () => {
		it('should hide the create input fields when click on undo button', async () => {
			const node = populateNode(nodeType);
			const linkName = 'Link name';
			const linkTitle = 'Link title';
			const linkDescription = 'Link description';
			const { user } = setup(
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					linkName={linkName}
					linkTitle={linkTitle}
					linkDescription={linkDescription}
				/>
			);
			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByRole('button', { name: /undo/i }));
			expect(
				screen.queryByRole('textbox', { name: /link's description/i })
			).not.toBeInTheDocument();
			expect(screen.queryByRole('textbox', { name: /expiration date/i })).not.toBeInTheDocument();
		});

		it('should hide the edit input fields when click on undo button', async () => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
			link.expires_at = getDayBefore();
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
			await screen.findByText(link.url as string);
			const editButton = screen.getByRole('button', { name: /edit/i });
			expect(editButton).toBeVisible();
			await user.click(editButton);
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			expect(inputDescription).toBeVisible();
			const inputExpiration = screen.getByRole('textbox', { name: /expiration date/i });
			expect(inputExpiration).toBeVisible();
			await user.click(screen.getByRole('button', { name: /undo/i }));
			expect(inputDescription).not.toBeInTheDocument();
			expect(inputExpiration).not.toBeInTheDocument();
		});
	});

	it('should render the description of the link if present', async () => {
		const node = populateNode(nodeType);
		const linkTitle = 'Link title';
		const link = populateLink(node);
		link.expires_at = null;
		link.description = 'This is the description';
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
		expect(screen.getByText(link.description)).toBeVisible();
	});

	it('should render the selected date from the calendar', async () => {
		const node = populateNode(nodeType);
		const linkTitle = 'Link title';
		const linkName = 'Link name';
		const linkDescription = 'Link description';
		const link = populateLink(node);
		const date = new Date();
		const currentDate = date.getDate();
		const expiresAt = initExpirationDate(date) as Date;
		link.expires_at = expiresAt?.getTime();
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
		await user.click(screen.getByRole('button', { name: /add link/i }));
		await user.click(screen.getByRole('textbox', { name: /expiration date/i }));
		await user.click(screen.getByText(currentDate));
		await user.click(screen.getByRole('button', { name: /generate link/i }));
		const expiresOnDate = formatDate(
			new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate(), 23, 59),
			'DD/MM/YY'
		);
		const expiresOnRegexp = RegExp(`expires on: ${expiresOnDate}`, 'i');
		expect(screen.getByText(expiresOnRegexp)).toBeVisible();
	});

	describe('Expiration message', () => {
		test('should render "Has no expiration date" message if expiration date is not set', async () => {
			const node = populateNode(nodeType);
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
			const node = populateNode(nodeType);
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
			const node = populateNode(nodeType);
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
	});

	describe('Copy link', () => {
		test('can copy the link to clipboard if there is no expiration', async () => {
			const node = populateNode(nodeType);
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
			expect(await screen.findByText(`${linkName} copied`)).toBeVisible();
		});

		test('can copy the link to clipboard if it is not expired', async () => {
			const node = populateNode(nodeType);
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
			expect(await screen.findByText(`${linkName} copied`)).toBeVisible();
		});

		test('cannot copy the link to clipboard if it is expired', async () => {
			const node = populateNode(nodeType);
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const link = populateLink(node);
			link.expires_at = getDayBefore();
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

		it('should copy the link when click on "COPY LINK" button on the snackbar', async () => {
			const node = populateNode(nodeType);
			const linkTitle = 'Link title';
			const link = populateLink(node);
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
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
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			expect(await screen.findByText(link.url as string)).toBeVisible();
			expect(await screen.findByText(`New ${linkName} generated`)).toBeVisible();
			await user.click(screen.getByText(/copy link/i));
			expect(copyToClipboardFn).toBeCalledWith(link.url);
			expect(await screen.findByText(`${linkName} copied`)).toBeVisible();
		});

		it('should copy the link when click on "COPY LINK" button on the editing snackbar', async () => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				},
				Mutation: {
					updateLink: mockUpdateLink(link)
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
			await screen.findByText(link.url as string);
			await user.click(
				screen.getByRoleWithIcon('button', { name: /edit/i, icon: ICON_REGEXP.edit })
			);
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			await user.clear(inputDescription);
			await user.type(inputDescription, faker.string.alpha(10));
			await user.click(await screen.findByRole('button', { name: /edit link/i }));
			expect(await screen.findByText(`${linkName} updated`)).toBeVisible();
			await user.click(screen.getByText(/copy link/i));
			expect(copyToClipboardFn).toBeCalledWith(link.url);
			expect(await screen.findByText(`${linkName} copied`)).toBeVisible();
		});
	});

	describe('On error', () => {
		it('should leave open the fields valued when the call returns an error on create', async () => {
			const node = populateNode(nodeType);
			const linkTitle = 'Link title';
			const description = faker.string.alpha();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				},
				Mutation: {
					createLink: mockErrorResolver(generateError('create link error'))
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
			await user.type(screen.getByRole('textbox', { name: /link's description/i }), description);
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			expect(screen.getByRole('textbox', { name: /link's description/i })).toHaveValue(description);
		});

		it('should leave open the fields valued when the call returns an error on edit', async () => {
			const node = populateNode(nodeType);
			const linkTitle = 'Link title';
			const description = faker.string.alpha(10);
			const link = populateLink(node);
			const firstOfNextMonth = getFirstOfNextMonth();
			const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
			link.expires_at = expiresAt?.getTime();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				},
				Mutation: {
					updateLink: mockErrorResolver(generateError('update link error'))
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
			await screen.findByText(link.url as string);
			await user.click(
				screen.getByRoleWithIcon('button', { name: /edit/i, icon: ICON_REGEXP.edit })
			);
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			await user.clear(inputDescription);
			await user.type(inputDescription, description);
			await user.click(screen.getByRole('button', { name: /edit link/i }));
			expect(inputDescription).toHaveValue(description);
			const expiresOnDate = formatDate(
				new Date(
					firstOfNextMonth.getFullYear(),
					firstOfNextMonth.getMonth(),
					firstOfNextMonth.getDate(),
					23,
					59
				),
				'DD/MM/YYYY'
			);
			expect(screen.getByText(expiresOnDate)).toBeVisible();
		});
	});

	describe('Edit button', () => {
		it('should render the empty input fields when click on edit button', async () => {
			const node = populateNode(nodeType);
			const linkTitle = 'Link title';
			const link = populateLink(node);
			link.expires_at = null;
			link.description = '';
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
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			await user.click(screen.getByRole('button', { name: /edit/i }));
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			expect(inputDescription).toBeVisible();
			expect(inputDescription).toHaveValue('');
			expect(screen.getByRole('textbox', { name: /expiration date/i })).toBeVisible();
		});

		it('should render the populated description and expiration date input fields when click on edit button', async () => {
			const node = populateNode(nodeType);
			const linkTitle = 'Link title';
			const link = populateLink(node);
			const firstOfNextMonth = getFirstOfNextMonth();
			const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
			link.expires_at = expiresAt?.getTime();
			link.description = 'This is the description';
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
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
			expect(screen.getByText(link.description)).toBeVisible();
			await user.click(screen.getByRole('button', { name: /edit/i }));
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			expect(inputDescription).toBeVisible();
			expect(inputDescription).toHaveValue(link.description);
			const expiresOnDate = formatDate(
				new Date(
					firstOfNextMonth.getFullYear(),
					firstOfNextMonth.getMonth(),
					firstOfNextMonth.getDate(),
					23,
					59
				),
				'DD/MM/YYYY'
			);
			expect(screen.getByRole('textbox', { name: /expiration date/i })).toBeVisible();
			expect(screen.getByText(expiresOnDate)).toBeVisible();
		});
	});

	describe('Modal', () => {
		it.each([
			[
				'Remove',
				getDayBefore(),
				ICON_REGEXP.deletePermanently,
				`This link has expired, therefore it can't be used anymore to access the item. You can remove the link from the list or you can update its expiration date and other information in order to keep using it.`
			],
			[
				'Revoke',
				null,
				ICON_REGEXP.revoke,
				`By revoking this link, you are blocking access to {nodeName} for anyone who tries to use the link to access the item.`
			]
		])('should open the modal when click on %s button', async (btnName, expDate, icon, message) => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
			link.expires_at = expDate;
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
			await screen.findByText(link.url as string);
			await user.click(screen.getByRoleWithIcon('button', { name: btnName, icon }));
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			const modal = await screen.findByTestId('modal');
			expect(
				within(modal).getByText(RegExp(`${btnName} ${node.name} ${linkName}`, 'i'))
			).toBeVisible();
			const resolvedMsg = message.replace('{nodeName}', node.name);
			expect(screen.getByText(resolvedMsg)).toBeVisible();
		});

		it('should close modal when click on X button', async () => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
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
			await screen.findByText(link.url as string);
			await user.click(
				screen.getByRoleWithIcon('button', { name: /revoke/i, icon: ICON_REGEXP.revoke })
			);
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			const closeButton = await screen.findByTestId(ICON_REGEXP.close);
			expect(closeButton).toBeVisible();
			await user.click(closeButton);
			expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
			expect(screen.queryByText(`Revoke ${node.name} ${linkName}`)).not.toBeInTheDocument();
			expect(
				screen.queryByText(
					`By revoking this link, you are blocking access to ${node.name} for anyone who tries to use the link to access the item.`
				)
			).not.toBeInTheDocument();
		});
	});

	describe('Delete link', () => {
		it.each([
			['Remove', getDayBefore(), ICON_REGEXP.deletePermanently],
			['Revoke', null, ICON_REGEXP.revoke]
		])('should delete link when click on %s button', async (btnName, expDate, icon) => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
			link.expires_at = expDate;
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				},
				Mutation: {
					deleteLinks: mockDeleteLink([link.id])
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
			await screen.findByText(link.url as string);
			await user.click(screen.getByRoleWithIcon('button', { name: btnName, icon }));
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			await screen.findByText(RegExp(`${btnName} ${node.name} ${linkName}`, 'i'));
			const deleteButtons = screen.getAllByRole('button', { name: btnName });
			expect(deleteButtons).toHaveLength(2);
			await user.click(deleteButtons[1]);
			expect(screen.queryByText(link.url as string)).not.toBeInTheDocument();
		});

		it('should close the modal when a link is deleted', async () => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				},
				Mutation: {
					deleteLinks: mockDeleteLink([link.id])
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
			await screen.findByText(link.url as string);
			await user.click(
				screen.getByRoleWithIcon('button', { name: /revoke/i, icon: ICON_REGEXP.revoke })
			);
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			await screen.findByText(`Revoke ${node.name} ${linkName}`);
			const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
			expect(revokeButtons).toHaveLength(2);
			await user.click(revokeButtons[1]);
			expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
		});
	});

	describe('Edit link', () => {
		it('should update the changes when click on "edit link" button', async () => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
			link.expires_at = null;
			link.description = 'This is the description';
			const newDescription = 'New description';
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				},
				Mutation: {
					updateLink: mockUpdateLink({ ...link, description: newDescription })
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
			await screen.findByText(link.url as string);
			await user.click(
				screen.getByRoleWithIcon('button', { name: /edit/i, icon: ICON_REGEXP.edit })
			);
			const editLinkBtn = await screen.findByRole('button', { name: /edit link/i });
			expect(editLinkBtn).toBeDisabled();
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			await user.clear(inputDescription);
			await user.type(inputDescription, newDescription);
			expect(editLinkBtn).toBeEnabled();
			await user.click(editLinkBtn);
			await screen.findByText(link.url as string);
			expect(await screen.findByText(newDescription)).toBeVisible();
		});

		it('should hide the edit input fields when a link is updated', async () => {
			const node = populateNode(nodeType);
			const link = populateLink(node);
			link.description = 'This is the description';
			link.expires_at = null;
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				},
				Mutation: {
					updateLink: mockUpdateLink(link)
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
			await screen.findByText(link.url as string);
			await user.click(
				screen.getByRoleWithIcon('button', { name: /edit/i, icon: ICON_REGEXP.edit })
			);
			const editLinkBtn = await screen.findByRole('button', { name: /edit link/i });
			expect(editLinkBtn).toBeDisabled();
			await user.type(
				screen.getByRole('textbox', { name: /link's description/i }),
				faker.string.alpha(10)
			);
			expect(editLinkBtn).toBeEnabled();
			await user.click(editLinkBtn);
			expect(
				screen.queryByRole('textbox', { name: /link's description/i })
			).not.toBeInTheDocument();
			expect(screen.queryByRole('textbox', { name: /expiration date/i })).not.toBeInTheDocument();
		});
	});
});
