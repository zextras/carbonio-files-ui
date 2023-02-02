/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen, waitFor } from '@testing-library/react';

import { DRAG_TYPES } from '../../constants';
import { setup } from '../../utils/testUtils';
import { Draggable } from './Draggable';

describe('Draggable', () => {
	test('Force drag end on mouse move after user release drag but no drag end is fired', async () => {
		const dragStartFn = jest.fn();
		const dragEndFn = jest.fn();
		setup(
			<Draggable onDragStart={dragStartFn} onDragEnd={dragEndFn} effect="move">
				Draggable element
			</Draggable>
		);

		const draggableItem = screen.getByText('Draggable element');
		expect(draggableItem).toBeVisible();

		fireEvent.dragStart(draggableItem, { dataTransfer: { types: [DRAG_TYPES.move] } });
		expect(dragStartFn).toHaveBeenCalled();

		// wait a second to allow draggable to register listener
		await waitFor(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 1000);
				})
		);

		fireEvent.dragEnter(window, { dataTransfer: { types: [DRAG_TYPES.move] } });
		fireEvent.dragOver(window, { dataTransfer: { types: [DRAG_TYPES.move] } });
		expect(dragEndFn).not.toHaveBeenCalled();

		// eslint-disable-next-line testing-library/prefer-user-event
		fireEvent.mouseMove(window);
		await waitFor(() => expect(dragEndFn).toHaveBeenCalled());
	});
});
