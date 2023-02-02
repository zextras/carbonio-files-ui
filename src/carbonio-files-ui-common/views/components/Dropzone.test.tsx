/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen, waitForElementToBeRemoved, within } from '@testing-library/react';

import { setup } from '../../utils/testUtils';
import { Dropzone } from './Dropzone';

describe('Dropzone', () => {
	test('Hide dropzone overlay if another target is reached even without a dragLeave event', async () => {
		setup(
			<>
				<div data-testid="dropzone1">
					<Dropzone effect="move" types={['test']}>
						{(): JSX.Element => <div>Dropzone 1</div>}
					</Dropzone>
				</div>
				<div data-testid="dropzone2">
					<Dropzone effect="move" types={['test']}>
						{(): JSX.Element => <div>Dropzone 2</div>}
					</Dropzone>
				</div>
			</>
		);

		const dropzone1 = screen.getByTestId('dropzone1');
		const dropzone2 = screen.getByTestId('dropzone2');
		expect(dropzone1).toBeVisible();
		expect(dropzone2).toBeVisible();
		fireEvent.dragEnter(dropzone1.firstElementChild as Element, {
			dataTransfer: { types: ['test'] }
		});
		await screen.findByTestId('dropzone-overlay');
		expect(within(dropzone1).getByTestId('dropzone-overlay')).toBeVisible();
		fireEvent.dragEnter(dropzone2.firstElementChild as Element, {
			dataTransfer: { types: ['test'] }
		});
		// first the dropzone1 is removed
		await waitForElementToBeRemoved(screen.queryByTestId('dropzone-overlay'));
		// and then the dropzone2 is shown
		await screen.findByTestId('dropzone-overlay');
		expect(within(dropzone2).getByTestId('dropzone-overlay')).toBeVisible();
		expect(within(dropzone1).queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
	});

	test('Hide dropzone overlay if a valid nested dropzone is reached', async () => {
		setup(
			<div data-testid="dropzone1">
				<Dropzone effect="move" types={['type1']}>
					{(): JSX.Element => (
						<div>
							<div>Dropzone 1</div>
							<div data-testid="dropzone2">
								<Dropzone effect="move" types={['type1']}>
									{(): JSX.Element => <div>Dropzone 2</div>}
								</Dropzone>
							</div>
							<div data-testid="dropzone3">
								<Dropzone effect="move" types={['type2']}>
									{(): JSX.Element => <div>Dropzone 3</div>}
								</Dropzone>
							</div>
						</div>
					)}
				</Dropzone>
			</div>
		);

		const dropzone1 = screen.getByTestId('dropzone1');
		const dropzone2 = screen.getByTestId('dropzone2');
		const dropzone3 = screen.getByTestId('dropzone3');
		expect(dropzone1).toBeVisible();
		expect(dropzone2).toBeVisible();
		expect(dropzone3).toBeVisible();
		fireEvent.dragEnter(dropzone1.firstElementChild as Element, {
			dataTransfer: { types: ['type1'] }
		});
		await screen.findByTestId('dropzone-overlay');
		expect(within(dropzone1).getByTestId('dropzone-overlay')).toBeVisible();
		fireEvent.dragEnter(dropzone2.firstElementChild as Element, {
			dataTransfer: { types: ['type1'] }
		});
		// dropzone1 is removed
		expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
		// and then the dropzone2 is shown
		await screen.findByTestId('dropzone-overlay');
		// only 1 dropzone is shown, and this is assured by the getBy selector which throws exception if more than one element is found
		expect(within(dropzone2).getByTestId('dropzone-overlay')).toBeVisible();
		// enter dropzone 3, which is an invalid dropzone for the type defined in dataTransfer
		fireEvent.dragEnter(dropzone3.firstElementChild as Element, {
			dataTransfer: { types: ['type1'] }
		});
		// overlay is removed from dropzone 2
		await waitForElementToBeRemoved(within(dropzone2).queryByTestId('dropzone-overlay'));
		// and is shown for dropzone 1
		await screen.findByTestId('dropzone-overlay');
		// dropzone 3 trigger dropzone 1 because it is an invalid dropzone
		expect(within(dropzone3).queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
	});
});
