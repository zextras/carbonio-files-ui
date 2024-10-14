/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { ComponentProps } from 'react';

import { PublicLink } from './PublicLink';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import { populateLink, populateNode } from '../../../../mocks/mockUtils';
import { screen, setup, within } from '../../../../tests/utils';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import { File as FilesFile, Folder } from '../../../../types/graphql/types';
import { mockGetLinks } from '../../../../utils/resolverMocks';
import * as moduleUtils from '../../../../utils/utils';
import { isFolder } from '../../../../utils/utils';

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

	it('should generate the access code on first render', async () => {
		const spy = jest.spyOn(moduleUtils, 'generateAccessCode');
		const props = getPublicLinkProps(populateNode('Folder'));
		const { user } = setup(<PublicLink {...props} />);

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

	describe('buttons', () => {
		it('should render the copy and regenerate buttons when the user enables the switch', async () => {
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

		it('should render tooltip and copy the access code when the user clicks on the copy button', async () => {
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
			const { user } = setup(<PublicLink {...props} />);

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
		it('should render the chip with the hidden access code when the link is generated (access code is enabled)', async () => {
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

		it('should render the tooltip "copy access code" when the user hovers on the chip with the hidden access code', async () => {
			const props = getPublicLinkProps(populateNode('Folder'));
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			const chip = screen.getByTestId(SELECTORS.chip);
			await user.hover(within(chip).getByText('**********'));
			expect(await screen.findByText(/copy access code/i)).toBeVisible();
		});

		it('should copy the access code when the user clicks on its chip', async () => {
			const spy = jest.spyOn(moduleUtils, 'generateAccessCode');
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const props = getPublicLinkProps(populateNode('Folder'));
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			const chip = screen.getByTestId(SELECTORS.chip);
			await user.click(within(chip).getByText('**********'));
			const accessCodeValue = spy.mock.results[0].value;
			expect(copyToClipboardFn).toHaveBeenCalledWith(accessCodeValue);
		});

		it('should not copy the access code when the user clicks on the EyeOffOutline icon', async () => {
			const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
			const props = getPublicLinkProps(populateNode('Folder'));
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			const chip = screen.getByTestId(SELECTORS.chip);
			await user.click(within(chip).getByTestId(ICON_REGEXP.eyePasswordOff));
			expect(copyToClipboardFn).not.toHaveBeenCalled();
		});

		it('should render the tooltip "show access code" when the user hovers on the EyeOffOutline icon of the chip with the hidden access code', async () => {
			const props = getPublicLinkProps(populateNode('Folder'));
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			const chip = screen.getByTestId(SELECTORS.chip);
			await user.hover(within(chip).getByTestId(ICON_REGEXP.eyePasswordOff));
			expect(await screen.findByText(/show access code/i)).toBeVisible();
		});

		it('should not render the chip with the access code when the link is generated (access code in not enabled)', async () => {
			const props = getPublicLinkProps(populateNode('Folder'));
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			expect(screen.queryByText(/access code:/i)).not.toBeInTheDocument();
			expect(screen.queryByText('**********')).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.eyePasswordOff)).not.toBeInTheDocument();
		});

		it('should show the access code and change the icon to EyeOutline when the user clicks on the EyeOffOutline icon', async () => {
			const spy = jest.spyOn(moduleUtils, 'generateAccessCode');
			const props = getPublicLinkProps(populateNode('Folder'));
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			const chip = screen.getByTestId(SELECTORS.chip);
			await user.click(within(chip).getByTestId(ICON_REGEXP.eyePasswordOff));
			const accessCodeValue = spy.mock.results[0].value;
			expect(within(chip).getByText(accessCodeValue)).toBeVisible();
			expect(screen.queryByText('**********')).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.eyePasswordOff)).not.toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.eyePasswordOn)).toBeVisible();
		});

		it('should render the tooltip "hide access code" when the user hovers on the EyeOutline icon', async () => {
			const props = getPublicLinkProps(populateNode('Folder'));
			const { user } = setup(<PublicLink {...props} />);

			await user.click(screen.getByRole('button', { name: /add link/i }));
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));
			await user.click(screen.getByRole('button', { name: /generate link/i }));
			const chip = screen.getByTestId(SELECTORS.chip);
			await user.hover(within(chip).getByTestId(ICON_REGEXP.eyePasswordOn));
			expect(await screen.findByText(/hide access code/i)).toBeVisible();
		});
	});
});
