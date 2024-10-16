/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { ComponentProps } from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';

import { PublicLink } from './PublicLink';
import { isDescriptionChanged } from './PublicLinkComponent';
import { DATE_TIME_FORMAT } from '../../../../constants';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import { populateLink, populateLinks, populateNode } from '../../../../mocks/mockUtils';
import { generateError, getFirstOfNextMonth, screen, setup, within } from '../../../../tests/utils';
import { Node } from '../../../../types/common';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import { File as FilesFile, Folder } from '../../../../types/graphql/types';
import {
	mockCreateLink,
	mockDeleteLinks,
	mockErrorResolver,
	mockGetLinks,
	mockUpdateLink
} from '../../../../utils/resolverMocks';
import { formatDate, initExpirationDate, isFolder } from '../../../../utils/utils';
import * as moduleUtils from '../../../../utils/utils';

const getDayBefore = (): number | undefined => {
	const date = new Date();
	date.setDate(date.getDate() - 1);
	date.setHours(0, 0, 0, 0);
	return initExpirationDate(date)?.getTime();
};

function getPublicLinkProps(node: FilesFile | Folder): ComponentProps<typeof PublicLink> {
	return {
		linkName: 'Link name',
		linkTitle: 'Link title',
		linkDescription: 'Link description',
		isFolder: isFolder(node),
		nodeId: node.id,
		nodeName: node.name
	};
}

describe.each<Node['__typename']>(['File', 'Folder'])('Public Link', (nodeType) => {
	it('should render the link section with title and description', async () => {
		const node = populateNode(nodeType);
		const props = getPublicLinkProps(node);
		const existingLink = populateLink(node);
		const mocks = {
			Query: {
				getLinks: mockGetLinks([existingLink])
			}
		} satisfies Partial<Resolvers>;
		setup(<PublicLink {...props} />, { mocks });

		await screen.findByText(existingLink.url as string);
		expect(screen.getByText(props.linkTitle)).toBeVisible();
		expect(screen.getByText(props.linkDescription)).toBeVisible();
		expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
	});

	describe('On add', () => {
		it('should render the description and expiration date input fields', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			const addLinkBtn = screen.getByRole('button', { name: /add link/i });
			expect(addLinkBtn).toBeVisible();
			await user.click(addLinkBtn);
			expect(screen.getByRole('textbox', { name: /link's description/i })).toBeVisible();
			expect(screen.getByRole('textbox', { name: /expiration date/i })).toBeVisible();
		});

		describe('On generate', () => {
			it('should render the selected date from the calendar', async () => {
				const node = populateNode(nodeType);
				const props = getPublicLinkProps(node);
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
				const { user } = setup(<PublicLink {...props} />, { mocks });

				await user.click(screen.getByRole('button', { name: /add link/i }));
				await user.click(screen.getByRole('textbox', { name: /expiration date/i }));
				await user.click(screen.getAllByText(currentDate)[0]);
				await user.click(screen.getByRole('button', { name: /generate link/i }));
				const expiresOnDate = formatDate(
					new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate(), 23, 59),
					undefined,
					DATE_TIME_FORMAT
				);
				const expiresOnRegexp = RegExp(`expires on: ${expiresOnDate}`, 'i');
				expect(screen.getByText(expiresOnRegexp)).toBeVisible();
			});

			it('should render undo and generate link buttons when a link is created', async () => {
				const node = populateNode(nodeType);
				const props = getPublicLinkProps(node);
				const link = populateLink(node);
				const mocks = {
					Query: {
						getLinks: mockGetLinks([])
					},
					Mutation: {
						createLink: mockCreateLink(link)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<PublicLink {...props} />, { mocks });

				const addLinkBtn = screen.getByRole('button', { name: /add link/i });
				expect(addLinkBtn).toBeVisible();
				await user.click(addLinkBtn);
				expect(screen.getByRole('button', { name: /undo/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /generate link/i })).toBeVisible();
			});

			it('should render revoke and edit buttons when a link is generated', async () => {
				const node = populateNode(nodeType);
				const props = getPublicLinkProps(node);
				const link = populateLink(node);
				const mocks = {
					Query: {
						getLinks: mockGetLinks([])
					},
					Mutation: {
						createLink: mockCreateLink(link)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<PublicLink {...props} />, { mocks });

				await user.click(screen.getByRole('button', { name: /add link/i }));
				expect(screen.queryByRole('button', { name: /add link/i })).not.toBeInTheDocument();
				await user.click(screen.getByRole('button', { name: /generate link/i }));
				expect(await screen.findByText(link.url as string)).toBeVisible();
				expect(screen.getByRole('button', { name: /add link/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /revoke/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /edit/i })).toBeVisible();
				const snackbar = await screen.findByText(`New ${props.linkName} generated`);
				expect(snackbar).toBeVisible();
			});
		});

		it('should render maximum length error when the description length is greater than 300 characters', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByRole('textbox', { name: /link's description/i }));
			await user.paste(faker.string.alpha(301));
			expect(screen.getByText(/Maximum length allowed is 300 characters/i)).toBeVisible();
			expect(screen.getByRole('button', { name: /generate link/i })).toBeDisabled();
		});
	});

	it('should render limit reached message when the user has created 50 links', async () => {
		const node = populateNode(nodeType);
		const props = getPublicLinkProps(node);
		const links = populateLinks(node, 50);
		const mocks = {
			Query: {
				getLinks: mockGetLinks(links)
			}
		} satisfies Partial<Resolvers>;
		setup(<PublicLink {...props} />, { mocks });

		await screen.findAllByText(links[0].url as string);
		expect(screen.getByText(/The maximum amount of public links has been reached/i)).toBeVisible();
		expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /generate link/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /add link/i })).not.toBeInTheDocument();
	});

	describe('Undo button', () => {
		it('should hide the create input fields when click on undo button', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByRole('button', { name: /undo/i }));
			expect(
				screen.queryByRole('textbox', { name: /link's description/i })
			).not.toBeInTheDocument();
			expect(screen.queryByRole('textbox', { name: /expiration date/i })).not.toBeInTheDocument();
		});

		it('should hide the edit input fields when click on undo button', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const link = populateLink(node);
			link.expires_at = getDayBefore();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

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

		it('should not update link description/expiration date', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const link = populateLink(node);
			const firstOfNextMonth = getFirstOfNextMonth();
			const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
			link.description = 'This is the description';
			link.expires_at = expiresAt?.getTime();
			const newDescription = faker.string.alpha(10);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			const expiresOnDate = formatDate(
				new Date(
					firstOfNextMonth.getFullYear(),
					firstOfNextMonth.getMonth(),
					firstOfNextMonth.getDate(),
					23,
					59
				),
				undefined,
				DATE_TIME_FORMAT
			);
			const expDate = formatDate(
				new Date(
					firstOfNextMonth.getFullYear(),
					firstOfNextMonth.getMonth(),
					firstOfNextMonth.getDate()
				)
			);
			const secondDay = firstOfNextMonth.getDate() + 1;
			const newExpiresOnDate = formatDate(
				new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth(), secondDay, 23, 59),
				undefined,
				DATE_TIME_FORMAT
			);
			const expiresOnRegexp = RegExp(`expires on: ${expiresOnDate}`, 'i');
			const expiresOnRegexpUpdated = RegExp(`expires on: ${newExpiresOnDate}`, 'i');
			await screen.findByText(link.url as string);
			await user.click(screen.getByRole('button', { name: /edit/i }));
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			await user.type(inputDescription, newDescription);
			// if I try to click the expiration input field, it gives me an Error, so I click the date to open the modal
			await user.click(screen.getByText(expDate));
			// click on the next day
			await user.click(screen.getAllByText(secondDay)[0]);
			await user.click(screen.getByRole('button', { name: /undo/i }));
			expect(screen.queryByText(newDescription)).not.toBeInTheDocument();
			expect(screen.queryByText(expiresOnRegexpUpdated)).not.toBeInTheDocument();
			expect(screen.getByText(link.description)).toBeVisible();
			expect(screen.getByText(expiresOnRegexp)).toBeVisible();
		});
	});

	it('should render the description of the link if present', async () => {
		const node = populateNode(nodeType);
		const props = getPublicLinkProps(node);
		const link = populateLink(node);
		link.expires_at = null;
		link.description = 'This is the description';
		const mocks = {
			Query: {
				getLinks: mockGetLinks([link])
			}
		} satisfies Partial<Resolvers>;
		setup(<PublicLink {...props} />, { mocks });

		await screen.findByText(link.url as string);
		expect(screen.getByText(link.description)).toBeVisible();
	});

	describe('Expiration message', () => {
		it('should render "Has no expiration date" message if expiration date is not set', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const link = populateLink(node);
			link.expires_at = null;
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			expect(screen.getByText(/has no expiration date/i)).toBeVisible();
		});

		it('should render the expiration date if expiration date is set', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const link = populateLink(node);
			const firstOfNextMonth = getFirstOfNextMonth();
			const expiresAt = initExpirationDate(firstOfNextMonth) as Date;
			link.expires_at = expiresAt?.getTime();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			const expiresOnDate = formatDate(
				new Date(
					firstOfNextMonth.getFullYear(),
					firstOfNextMonth.getMonth(),
					firstOfNextMonth.getDate(),
					23,
					59
				),
				undefined,
				DATE_TIME_FORMAT
			);
			const expiresOnRegexp = RegExp(`expires on: ${expiresOnDate}`, 'i');
			expect(screen.getByText(expiresOnRegexp)).toBeVisible();
		});

		it('should render the message link has expired if the link is expired', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
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
			setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			const expiresOnDate = formatDate(
				new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59),
				undefined,
				DATE_TIME_FORMAT
			);
			const expiresOnRegexp = RegExp(`this link has expired on: ${expiresOnDate}`, 'i');
			expect(screen.getByText(expiresOnRegexp)).toBeVisible();
		});
	});

	describe('Copy link', () => {
		it('can copy the link to clipboard if there is no expiration', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);

			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const link = populateLink(node);
			link.expires_at = null;
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const linkName = 'Link name';
			const { user } = setup(<PublicLink {...props} />, { mocks });

			const urlElement = await screen.findByText(link.url as string);
			await user.click(urlElement);
			expect(copyToClipboardFn).toBeCalledWith(link.url);
			expect(await screen.findByText(`${linkName} copied`)).toBeVisible();
		});

		it('can copy the link to clipboard if it is not expired', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

			const urlElement = await screen.findByText(link.url as string);
			await user.click(urlElement);
			expect(copyToClipboardFn).toBeCalledWith(link.url);
			expect(await screen.findByText(`${linkName} copied`)).toBeVisible();
		});

		it('cannot copy the link to clipboard if it is expired', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const link = populateLink(node);
			link.expires_at = getDayBefore();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			const urlElement = await screen.findByText(link.url as string);
			await user.click(urlElement);
			expect(copyToClipboardFn).not.toHaveBeenCalledWith(link.url);
		});

		it('should copy the link when click on "COPY LINK" button on the snackbar', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			expect(await screen.findByText(link.url as string)).toBeVisible();
			expect(await screen.findByText(`New ${props.linkName} generated`)).toBeVisible();
			await user.click(screen.getByText(/copy link/i));
			expect(copyToClipboardFn).toBeCalledWith(link.url);
			expect(await screen.findByText(`${props.linkName} copied`)).toBeVisible();
		});

		it('should copy the link when click on "COPY LINK" button on the editing snackbar', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			await user.click(
				screen.getByRoleWithIcon('button', { name: /edit/i, icon: ICON_REGEXP.edit })
			);
			const inputDescription = screen.getByRole('textbox', { name: /link's description/i });
			await user.clear(inputDescription);
			await user.type(inputDescription, faker.string.alpha(10));
			await user.click(await screen.findByRole('button', { name: /edit link/i }));
			expect(await screen.findByText(`${props.linkName} updated`)).toBeVisible();
			await user.click(screen.getByText(/copy link/i));
			expect(copyToClipboardFn).toBeCalledWith(link.url);
			expect(await screen.findByText(`${props.linkName} copied`)).toBeVisible();
		});
	});

	describe('On error', () => {
		it('should leave open the fields valued when the call returns an error on create', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const description = faker.string.alpha();
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				},
				Mutation: {
					createLink: mockErrorResolver(generateError('create link error'))
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.type(screen.getByRole('textbox', { name: /link's description/i }), description);
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			expect(screen.getByRole('textbox', { name: /link's description/i })).toHaveValue(description);
		});

		it('should leave open the fields valued when the call returns an error on edit', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

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
					firstOfNextMonth.getDate()
				)
			);
			expect(screen.getByText(expiresOnDate)).toBeVisible();
		});
	});

	describe('Remove/Revoke Modal', () => {
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
			const props = getPublicLinkProps(node);
			const link = populateLink(node);
			link.expires_at = expDate;
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			await user.click(screen.getByRoleWithIcon('button', { name: btnName, icon }));
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			const modal = await screen.findByTestId(SELECTORS.modal);
			expect(
				within(modal).getByText(RegExp(`${btnName} ${node.name} ${props.linkName}`, 'i'))
			).toBeVisible();
			const resolvedMsg = message.replace('{nodeName}', node.name);
			expect(screen.getByText(resolvedMsg)).toBeVisible();
		});

		it('should close modal when click on X button', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
			const link = populateLink(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

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
			expect(screen.queryByTestId(SELECTORS.modal)).not.toBeInTheDocument();
			expect(screen.queryByText(`Revoke ${node.name} ${props.linkName}`)).not.toBeInTheDocument();
			expect(
				screen.queryByText(
					`By revoking this link, you are blocking access to ${node.name} for anyone who tries to use the link to access the item.`
				)
			).not.toBeInTheDocument();
		});

		describe('Delete link', () => {
			it.each([
				['Remove', getDayBefore(), ICON_REGEXP.deletePermanently],
				['Revoke', null, ICON_REGEXP.revoke]
			])('should delete link when click on %s button', async (btnName, expDate, icon) => {
				const node = populateNode(nodeType);
				const props = getPublicLinkProps(node);
				const link = populateLink(node);
				link.expires_at = expDate;
				const mocks = {
					Query: {
						getLinks: mockGetLinks([link])
					},
					Mutation: {
						deleteLinks: mockDeleteLinks([link.id])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<PublicLink {...props} />, { mocks });

				await screen.findByText(link.url as string);
				await user.click(screen.getByRoleWithIcon('button', { name: btnName, icon }));
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				await screen.findByText(RegExp(`${btnName} ${node.name} ${props.linkName}`, 'i'));
				const modal = await screen.findByTestId(SELECTORS.modal);
				await user.click(within(modal).getByRole('button', { name: btnName }));
				expect(screen.queryByText(link.url as string)).not.toBeInTheDocument();
			});

			it('should close the modal when a link is deleted', async () => {
				const node = populateNode(nodeType);
				const props = getPublicLinkProps(node);
				const link = populateLink(node);
				const mocks = {
					Query: {
						getLinks: mockGetLinks([link])
					},
					Mutation: {
						deleteLinks: mockDeleteLinks([link.id])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<PublicLink {...props} />, { mocks });

				await screen.findByText(link.url as string);
				await user.click(
					screen.getByRoleWithIcon('button', { name: /revoke/i, icon: ICON_REGEXP.revoke })
				);
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				await screen.findByText(`Revoke ${node.name} ${props.linkName}`);
				const modal = await screen.findByTestId(SELECTORS.modal);
				const deleteBtn = within(modal).getByRole('button', { name: /revoke/i });
				await user.click(deleteBtn);
				expect(screen.queryByTestId(SELECTORS.modal)).not.toBeInTheDocument();
			});
		});
	});

	describe('Edit link', () => {
		it('should render the empty input fields when click on edit button if the link has no description nor expiration date', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

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
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

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
					firstOfNextMonth.getDate()
				)
			);
			expect(screen.getByRole('textbox', { name: /expiration date/i })).toBeVisible();
			expect(screen.getByText(expiresOnDate)).toBeVisible();
		});

		it('should update the changes when click on "edit link" button', async () => {
			const node = populateNode(nodeType);
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

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
			const props = getPublicLinkProps(node);
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
			const { user } = setup(<PublicLink {...props} />, { mocks });

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

		it.todo('');
	});
	describe('isDescriptionChanged', () => {
		// logiche basate sull cambiamento percepito dall'utente dove '' e null | undefined non hanno differenza
		// olddescription null|undef e nuova description null| undef	 ----> false OK
		// olddescription null|undef e nuova description '' 			----> false OK
		// olddescription null|undef e nuova description stringa piena  ----> true OK
		// olddescription '' e nuova description null| undef 			---> false OK
		// olddescription '' e nuova description ''  					---> false OK
		// olddescription '' e nuova description stringa piena 			----> true OK
		// olddescription stringa piena e nuova description null| undef ----> true OK
		// olddescription stringa piena e nuova description '' 			----> true OK
		// olddescription stringa piena A e nuova description stringa piena A---> false OK
		// olddescription stringa piena A e nuova description stringa piena B ---> true OK

		it('should return false if the new description is the same as the old one', () => {
			const res = isDescriptionChanged('same description', 'same description');
			expect(isDescriptionChanged).toBeFalsy();
		});

		it('should return true if the new description is the not same as the old one', () => {
			const isDescriptionChanged = isDescriptionChanged(
				'same description',
				'different description'
			);
			expect(isDescriptionChanged).toBeTruthy();
		});

		it('should return false if the new description is undefined/null the not same as the old one', () => {
			const isDescriptionChanged = isDescriptionChanged(
				'same description',
				'different description'
			);
			expect(isDescriptionChanged).toBeTruthy();
		});
	});
});
