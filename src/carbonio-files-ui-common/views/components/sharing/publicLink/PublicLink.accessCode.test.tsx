/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { ComponentProps } from 'react';

import { faker } from '@faker-js/faker';

import { PublicLink } from './PublicLink';
import {
	calculateIsAccessCodeChanged,
	calculateIsExpirationChanged,
	calculateUpdatedAccessCode
} from './PublicLinkComponent';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import { populateLink, populateNode } from '../../../../mocks/mockUtils';
import { screen, setup, within } from '../../../../tests/utils';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import { File as FilesFile, Folder } from '../../../../types/graphql/types';
import { mockCreateLink, mockGetLinks } from '../../../../utils/resolverMocks';
import * as moduleUtils from '../../../../utils/utils';
import { generateAccessCode, isFolder } from '../../../../utils/utils';

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

describe('Access code', () => {
	it('should render the access code switch and description on folders', async () => {
		const props = getPublicLinkProps(populateNode('Folder'));
		const { user } = setup(<PublicLink {...props} />);

		await user.click(screen.getByRole('button', { name: /add link/i }));
		expect(screen.getByTestId(ICON_REGEXP.switchOff)).toBeVisible();
		expect(screen.getByText(/enable access code/i)).toBeVisible();
	});

	it('should not render the access code switch and description on files', async () => {
		const props = getPublicLinkProps(populateNode('File'));
		const { user } = setup(<PublicLink {...props} />);

		await user.click(screen.getByRole('button', { name: /add link/i }));
		expect(screen.queryByTestId(ICON_REGEXP.switchOff)).not.toBeInTheDocument();
		expect(screen.queryByText(/enable access code/i)).not.toBeInTheDocument();
	});

	it('should generate the access code when the user enables the access code', async () => {
		const spy = jest.spyOn(moduleUtils, 'generateAccessCode');
		const props = getPublicLinkProps(populateNode('Folder'));
		const mocks = {
			Query: {
				getLinks: mockGetLinks([])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<PublicLink {...props} />, { mocks });

		await user.click(screen.getByRole('button', { name: /add link/i }));
		await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
		const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
		const accessCodeValue = spy.mock.results[0].value;
		expect(spy).toHaveBeenCalledTimes(1);
		expect(accessCodeInput).toHaveValue(accessCodeValue);
	});

	it('should render the input password when the user enables the switch', async () => {
		const props = getPublicLinkProps(populateNode('Folder'));
		const { user } = setup(<PublicLink {...props} />);

		await user.click(screen.getByRole('button', { name: /add link/i }));
		expect(screen.queryByLabelText(/access code/i)).not.toBeInTheDocument();
		await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
		expect(screen.getByTestId(ICON_REGEXP.switchOn)).toBeVisible();
		const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
		expect(accessCodeInput).toBeDisabled();
		expect(accessCodeInput.value).toHaveLength(10);
		expect(screen.getByTestId(ICON_REGEXP.eyePasswordOff)).toBeEnabled();
	});

	it('should not render the input password when the user disables the switch', async () => {
		const props = getPublicLinkProps(populateNode('Folder'));
		const { user } = setup(<PublicLink {...props} />);

		await user.click(screen.getByRole('button', { name: /add link/i }));
		await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
		await user.click(screen.getByTestId(ICON_REGEXP.switchOn));
		expect(screen.queryByLabelText<HTMLInputElement>(/access code/i)).not.toBeInTheDocument();
	});

	it('should change the input type from password to text when the user clicks on the eye icon of the input', async () => {
		const node = populateNode('Folder');
		const props = getPublicLinkProps(node);
		const { user } = setup(<PublicLink {...props} />);

		await user.click(screen.getByRole('button', { name: /add link/i }));
		await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
		const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
		expect(accessCodeInput).toHaveAttribute('type', 'password');
		await user.click(screen.getByTestId(ICON_REGEXP.eyePasswordOff));
		expect(screen.getByRole('textbox', { name: /access code/i })).toHaveAttribute('type', 'text');
	});

	describe('Copy and regenerate buttons', () => {
		it('should render the copy and regenerate buttons when the user enables the access code', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.copy })).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.regenerateAccessCode })
			).toBeVisible();
		});

		it('should not render the copy and regenerate buttons when the user disables the access code', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOn));
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.copy })
			).not.toBeInTheDocument();
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.regenerateAccessCode })
			).not.toBeInTheDocument();
		});

		it('should render the tooltip when the user hovers the copy button', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.hover(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.copy }));
			expect(await screen.findByText(/copy access code/i)).toBeVisible();
		});

		it('should render the tooltip when the user hovers the regenerate button', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.hover(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.regenerateAccessCode })
			);
			expect(await screen.findByText(/generate new access code/i)).toBeVisible();
		});

		it('should copy the access code when the user clicks on the copy button', async () => {
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.copy }));
			const snackbar = await screen.findByTestId(SELECTORS.snackbar);
			expect(within(snackbar).getByText(/access code copied/i)).toBeVisible();
			const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
			expect(copyToClipboardFn).toHaveBeenCalledWith(accessCodeInput.value);
		});

		it('should generate a new access code when the user clicks on the regenerate button', async () => {
			const spy = jest.spyOn(moduleUtils, 'generateAccessCode');
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<PublicLink {...props} />, { mocks });

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
			const accessCodeValue = spy.mock.results[0].value;
			await user.click(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.regenerateAccessCode })
			);
			const newAccessCodeValue = spy.mock.results[1].value;
			expect(newAccessCodeValue).not.toBe(accessCodeValue);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(accessCodeInput).toHaveValue(newAccessCodeValue);
		});
	});

	describe('Access code generated', () => {
		it('should render the chip with the hidden access code (access code is enabled)', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, true);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			setup(<PublicLink {...props} />, { mocks });

			expect(await screen.findByText(/access code:/i)).toBeVisible();
			const accessCodeChip = screen
				.getAllByTestId(SELECTORS.chip)
				.find((chip) => within(chip).queryByText('**********') !== null) as HTMLElement;
			expect(
				within(accessCodeChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.eyePasswordOff })
			).toBeVisible();
		});

		it('should render the tooltip when the user hovers the chip with the hidden access code (access code is enabled)', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, true);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			expect(await screen.findByText(/access code:/i)).toBeVisible();
			await user.hover(screen.getByText('**********'));
			expect(await screen.findByText(/copy access code/i)).toBeVisible();
		});

		it('should render the same access code as the one in the input when the user clicks on generate button', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, true);
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
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
			const accessCodeValue = accessCodeInput.value;
			link.access_code = accessCodeValue;
			mocks.Mutation.createLink = mockCreateLink(link);
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.eyePasswordOff));
			expect(screen.getByText(accessCodeValue)).toBeVisible();
		});

		it('should not render the chip with the access code when the link is generated (access code in not enabled)', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, false);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			expect(screen.queryByText(/access code:/i)).not.toBeInTheDocument();
			expect(screen.queryByText('**********')).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.eyePasswordOff)).not.toBeInTheDocument();
		});
	});

	describe('Edit access code', () => {
		it('should render the switch enabled and the current access code when click on edit button (access code was set)', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, true);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			await user.click(screen.getByRole('button', { name: /edit/i }));
			expect(screen.getByTestId(ICON_REGEXP.switchOn)).toBeVisible();
			const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
			expect(accessCodeInput).toBeVisible();
			expect(accessCodeInput).toHaveValue(link.access_code);
		});

		it('should render the switch disabled when click on edit button (access code was not set)', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, false);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			await user.click(screen.getByRole('button', { name: /edit/i }));
			expect(screen.getByTestId(ICON_REGEXP.switchOff)).toBeVisible();
		});

		it('should enable the edit link button when the user enables the switch (access code was not set)', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, false);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			await user.click(screen.getByRole('button', { name: /edit/i }));
			expect(screen.getByRole('button', { name: /edit link/i })).toBeDisabled();
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			expect(screen.getByTestId(ICON_REGEXP.switchOn)).toBeVisible();
			expect(screen.getByRole('button', { name: /edit link/i })).toBeEnabled();
		});

		it('should enable the edit link button when the user disables the switch (access code was set)', async () => {
			const node = populateNode('Folder');
			const props = getPublicLinkProps(node);
			const link = populateLink(node, true);
			const mocks = {
				Query: {
					getLinks: mockGetLinks([link])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<PublicLink {...props} />, { mocks });

			await screen.findByText(link.url as string);
			await user.click(screen.getByRole('button', { name: /edit/i }));
			expect(screen.getByRole('button', { name: /edit link/i })).toBeDisabled();
			await user.click(screen.getByTestId(ICON_REGEXP.switchOn));
			expect(screen.getByTestId(ICON_REGEXP.switchOff)).toBeVisible();
			expect(screen.getByRole('button', { name: /edit link/i })).toBeEnabled();
		});

		describe('Update access code', () => {
			it.todo('should update the changes when the user clicks on "edit link" button');
		});

		describe('Undo', () => {
			it('should hide the access code section when the user clicks on undo button', async () => {
				const node = populateNode('Folder');
				const props = getPublicLinkProps(node);
				const link = populateLink(node, true);
				const mocks = {
					Query: {
						getLinks: mockGetLinks([link])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<PublicLink {...props} />, { mocks });

				await screen.findByText(link.url as string);
				expect(screen.queryByText(/enable access code/i)).not.toBeInTheDocument();
				await user.click(screen.getByRole('button', { name: /edit/i }));
				expect(screen.getByText(/enable access code/i)).toBeVisible();
				await user.click(screen.getByRole('button', { name: /undo/i }));
				expect(screen.queryByText(/enable access code/i)).not.toBeInTheDocument();
			});

			it('should not change the access code when the user clicks on undo button after regenerating a new access code', async () => {
				const node = populateNode('Folder');
				const props = getPublicLinkProps(node);
				const link = populateLink(node, true);
				const initialAccessCode = link.access_code;
				const mocks = {
					Query: {
						getLinks: mockGetLinks([link])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<PublicLink {...props} />, { mocks });

				await screen.findByText(link.url as string);
				await user.click(screen.getByRole('button', { name: /edit/i }));
				await user.click(
					screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.regenerateAccessCode })
				);
				const newAccessCode = screen.getByLabelText<HTMLInputElement>(/access code/i).value;
				expect(newAccessCode).not.toBe(initialAccessCode);
				await user.click(screen.getByRole('button', { name: /undo/i }));
				await user.click(screen.getByRole('button', { name: /edit/i }));
				expect(screen.getByLabelText<HTMLInputElement>(/access code/i).value).toBe(
					initialAccessCode
				);
			});

			it('should render the switch disabled when the user clicks on undo and then click on add link button', async () => {
				const node = populateNode('Folder');
				const props = getPublicLinkProps(node);
				const mocks = {
					Query: {
						getLinks: mockGetLinks([])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<PublicLink {...props} />, { mocks });

				await user.click(screen.getByRole('button', { name: /add link/i }));
				await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
				await user.click(screen.getByRole('button', { name: /undo/i }));
				await user.click(screen.getByRole('button', { name: /add link/i }));
				expect(screen.getByTestId(ICON_REGEXP.switchOff)).toBeVisible();
			});

			it('should regenerate a new access code when the user clicks on undo and then click on add link button', async () => {
				const node = populateNode('Folder');
				const props = getPublicLinkProps(node);
				const mocks = {
					Query: {
						getLinks: mockGetLinks([])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<PublicLink {...props} />, { mocks });

				await user.click(screen.getByRole('button', { name: /add link/i }));
				await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
				const accessCodeInput = screen.getByLabelText<HTMLInputElement>(/access code/i);
				const accessCodeValue = accessCodeInput.value;
				await user.click(screen.getByRole('button', { name: /undo/i }));
				await user.click(screen.getByRole('button', { name: /add link/i }));
				await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
				const accessCodeValue2 = screen.getByLabelText<HTMLInputElement>(/access code/i).value;
				expect(accessCodeValue2).not.toBe(accessCodeValue);
			});
		});

		describe('CalculateUpdatedAccessCode', () => {
			it('should return a new access code when the access code was not set and a new one is added', () => {
				const newAccessCode = generateAccessCode();
				expect(
					calculateUpdatedAccessCode(
						faker.helpers.arrayElement([undefined, null]),
						newAccessCode,
						true
					)
				).toBe(newAccessCode);
			});

			it('should return an empty string when the access code was set and then we remove it', () => {
				const result = calculateUpdatedAccessCode(
					generateAccessCode(),
					generateAccessCode(),
					false
				);
				expect(result).toBe('');
			});

			it('should return new access code when the access code was set and then we change it', () => {
				const newAccessCode = generateAccessCode();
				expect(calculateUpdatedAccessCode(generateAccessCode(), newAccessCode, true)).toBe(
					newAccessCode
				);
			});

			it('should return undefined when the access code was set and it is not changed', () => {
				const accessCode = generateAccessCode();
				expect(calculateUpdatedAccessCode(accessCode, accessCode, true)).toBeUndefined();
			});

			it('should return undefined when the access code was not set and we do not add it', () => {
				expect(
					calculateUpdatedAccessCode(
						faker.helpers.arrayElement([undefined, null]),
						generateAccessCode(),
						false
					)
				).toBeUndefined();
			});

			it('should throw an error if access code was empty string', () => {
				const newAccessCode = generateAccessCode();
				const canCalculateUpdateAccessCode: () => ReturnType<
					typeof calculateUpdatedAccessCode
				> = () => calculateUpdatedAccessCode('', newAccessCode, false);
				expect(canCalculateUpdateAccessCode).toThrow('Unexpected access code length 0');
			});
		});

		describe('calculateIsAccessCodeChanged', () => {
			it('should throw an error if the old access code is an empty string', () => {
				const canCalculateIsAccessCodeChanged: () => ReturnType<
					typeof calculateIsAccessCodeChanged
				> = () => calculateIsAccessCodeChanged('', generateAccessCode(), true);
				expect(canCalculateIsAccessCodeChanged).toThrow('Unexpected access code length 0');
			});

			it('should throw an error if the new access code is an empty string', () => {
				const canCalculateIsAccessCodeChanged: () => ReturnType<
					typeof calculateIsAccessCodeChanged
				> = () => calculateIsAccessCodeChanged(generateAccessCode(), '', true);
				expect(canCalculateIsAccessCodeChanged).toThrow('Unexpected access code length 0');
			});

			it.each([[undefined, null]])(
				'should return true when the access code was not set and the user sets it',
				(oldAccessCode) => {
					expect(
						calculateIsAccessCodeChanged(oldAccessCode, generateAccessCode(), true)
					).toBeTruthy();
				}
			);

			it.each([[undefined, null]])(
				'should return false when was unset and remains unset ',
				(oldAccessCode) => {
					expect(
						calculateIsAccessCodeChanged(oldAccessCode, generateAccessCode(), false)
					).toBeFalsy();
				}
			);

			it('should return false when was set and remains the same', () => {
				const accessCode = generateAccessCode();
				expect(calculateIsAccessCodeChanged(accessCode, accessCode, true)).toBeFalsy();
			});

			it('should return true when the access code was set and the user regenerates it', () => {
				expect(
					calculateIsAccessCodeChanged(generateAccessCode(), generateAccessCode(), true)
				).toBeTruthy();
			});

			it('should return true when the access code was set and the user unset it', () => {
				expect(
					calculateIsAccessCodeChanged(generateAccessCode(), generateAccessCode(), false)
				).toBeTruthy();
			});
		});

		describe('CalculateIsExpirationChanged', () => {
			it.each([null, undefined])(
				'should return true if the expiration date was not set (%s) and then the user sets it',
				(expiresAt) => {
					expect(
						calculateIsExpirationChanged(expiresAt, faker.date.future().setHours(23, 59, 59))
					).toBeTruthy();
				}
			);

			it.each([
				[null, undefined],
				[undefined, null],
				[null, null],
				[undefined, undefined]
			])(
				'should return false if the expiration date was not set and the users does not set it',
				(expiresAt, updatedTimestamp) => {
					expect(calculateIsExpirationChanged(expiresAt, updatedTimestamp)).toBeFalsy();
				}
			);

			it.each([null, undefined])(
				'should return true if the expiration date was set and the user unset it',
				(updatedTimestamp) => {
					expect(
						calculateIsExpirationChanged(faker.date.future().setHours(23, 59, 59), updatedTimestamp)
					).toBeTruthy();
				}
			);

			it('should return true if the expiration date was set and the user changes it', () => {
				expect(
					calculateIsExpirationChanged(
						faker.date.future().setHours(23, 59, 59),
						faker.date.future().setHours(23, 59, 59)
					)
				).toBeTruthy();
			});

			it('should return true if the expiration date was set and the user changes it', () => {
				const expirationDate = faker.date.future().setHours(23, 59, 59);
				expect(calculateIsExpirationChanged(expirationDate, expirationDate)).toBeFalsy();
			});
		});
	});
});
