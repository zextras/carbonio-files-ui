/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { AccessCodeComponent } from './AccessCodeComponent';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import { screen, setup, within } from '../../../../tests/utils';
import { generateAccessCode } from '../../../../utils/utils';
import * as moduleUtils from '../../../../utils/utils';

describe('AccessCodeComponent', () => {
	it('should render the chip with the hidden access code', () => {
		setup(<AccessCodeComponent accessCode={generateAccessCode()} />);

		expect(screen.getByText(/access code:/i)).toBeVisible();
		const chip = screen.getByTestId(SELECTORS.chip);
		expect(within(chip).getByText('**********')).toBeVisible();
		expect(
			within(chip).getByRoleWithIcon('button', { icon: ICON_REGEXP.eyePasswordOff })
		).toBeVisible();
	});

	it('should render the tooltip "Copy access code" when the user hovers on the chip with the hidden access code', async () => {
		const { user } = setup(<AccessCodeComponent accessCode={generateAccessCode()} />);

		const chip = screen.getByTestId(SELECTORS.chip);
		await user.hover(within(chip).getByText('**********'));
		expect(await screen.findByText(/copy access code/i)).toBeVisible();
	});

	it('should render the tooltip "Show access code" when the user hovers on the EyeOffOutline icon of the chip with the hidden access code', async () => {
		const { user } = setup(<AccessCodeComponent accessCode={generateAccessCode()} />);

		const chip = screen.getByTestId(SELECTORS.chip);
		await user.hover(within(chip).getByTestId(ICON_REGEXP.eyePasswordOff));
		expect(await screen.findByText(/show access code/i)).toBeVisible();
	});

	it('should copy the access code and render a snackbar when the user clicks on its chip', async () => {
		const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
		const accessCode = generateAccessCode();
		const { user } = setup(<AccessCodeComponent accessCode={accessCode} />);

		const chip = screen.getByTestId(SELECTORS.chip);
		await user.click(within(chip).getByText('**********'));
		expect(copyToClipboardFn).toHaveBeenCalledWith(accessCode);
		const snackbar = screen.getByTestId(SELECTORS.snackbar);
		expect(within(snackbar).getByText(/access code copied/i)).toBeVisible();
	});

	it('should show the access code and change the icon to EyeOutline when the user clicks on the EyeOffOutline icon', async () => {
		const accessCode = generateAccessCode();
		const { user } = setup(<AccessCodeComponent accessCode={accessCode} />);

		const chip = screen.getByTestId(SELECTORS.chip);
		await user.click(within(chip).getByTestId(ICON_REGEXP.eyePasswordOff));
		expect(within(chip).getByText(accessCode)).toBeVisible();
		expect(screen.queryByText('**********')).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.eyePasswordOff)).not.toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.eyePasswordOn)).toBeVisible();
	});

	it('should not copy the access code when the user clicks on the EyeOffOutline icon', async () => {
		const copyToClipboardFn = jest.spyOn(moduleUtils, 'copyToClipboard');
		const accessCode = generateAccessCode();
		const { user } = setup(<AccessCodeComponent accessCode={accessCode} />);

		const chip = screen.getByTestId(SELECTORS.chip);
		await user.click(within(chip).getByTestId(ICON_REGEXP.eyePasswordOff));
		expect(copyToClipboardFn).not.toHaveBeenCalled();
	});

	it('should render the tooltip "Hide access code" when the user hovers on the EyeOutline icon', async () => {
		const { user } = setup(<AccessCodeComponent accessCode={generateAccessCode()} />);

		const chip = screen.getByTestId(SELECTORS.chip);
		await user.click(within(chip).getByTestId(ICON_REGEXP.eyePasswordOff));
		await user.hover(screen.getByTestId(ICON_REGEXP.eyePasswordOn));
		expect(await screen.findByText(/hide access code/i)).toBeVisible();
	});
});
