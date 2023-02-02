/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useRef } from 'react';

import { Container } from '@zextras/carbonio-design-system';

import { TIMERS } from '../../constants';

interface DraggableProps {
	onDragStart: React.DragEventHandler<HTMLElement>;
	onDragEnd: (event: React.DragEvent<HTMLElement> | MouseEvent) => void;
	draggable?: boolean;
	effect: typeof DataTransfer.prototype.effectAllowed;
}

export const Draggable: React.FC<DraggableProps> = ({
	children,
	onDragStart,
	onDragEnd,
	draggable = true,
	effect
}) => {
	const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// ---- Workaround to fire dragEnd when dragged element is removed from DOM ----
	// Since the dragend event is not fired when the node is removed from the DOM
	// we need a way to programmatically fire the dragEnd callback to allow caller to reset things.
	// To accomplish this, we use a listener on the mousemove event attached to the window object.
	// This works because during a drag operation mouse events are not fired, so if a mouse event is received
	// it means the drag operation is ended.
	// The listener is added after a timeout to be sure the drag operation is started.
	// There could be a delay between the moment the user actually starts the drag operation and the moment the browser
	// process it, caused by the variable complexity of the logic built in the drag start handler
	// (especially the creation of the dragImage).
	// The listener is created with the "once" option to true, so it only will run one time, and then it will be removed.
	// The listener is also programmatically removed when the dragend event is actually fired,
	// so only one between the dragend and the mousemove listener are executed.
	// One of the solution found online suggests adding a listener on the dragover event,
	// because it should be fired every few hundred milliseconds (https://developer.mozilla.org/en-US/docs/Web/API/Document/dragover_event)
	// but this behaviour is different between chrome based browsers and firefox. Firefox does not fire a dragover if the mouse is not moving,
	// so we could incur in a false positive "user is not dragging anymore" assumption, just because he/she has stopped moving the mouse.
	const mouseMoveAfterDragListener = useCallback(
		(event: MouseEvent) => {
			onDragEnd(event);
		},
		[onDragEnd]
	);

	const dragStartHandler = useCallback<React.DragEventHandler<HTMLElement>>(
		(event) => {
			onDragStart(event);
			event.dataTransfer.effectAllowed = draggable ? effect : 'none';
			mouseMoveTimeoutRef.current && clearTimeout(mouseMoveTimeoutRef.current);
			mouseMoveTimeoutRef.current = setTimeout(() => {
				window.addEventListener('mousemove', mouseMoveAfterDragListener, { once: true });
			}, TIMERS.MOUSE_MOVE_TIMEOUT);
		},
		[draggable, effect, mouseMoveAfterDragListener, onDragStart]
	);

	const dragEndHandler = useCallback<React.DragEventHandler<HTMLElement>>(
		(event) => {
			onDragEnd(event);
			mouseMoveTimeoutRef.current && clearTimeout(mouseMoveTimeoutRef.current);
			mouseMoveTimeoutRef.current = null;
			window.removeEventListener('mousemove', mouseMoveAfterDragListener);
		},
		[mouseMoveAfterDragListener, onDragEnd]
	);

	return (
		<Container draggable={draggable} onDragStart={dragStartHandler} onDragEnd={dragEndHandler}>
			{children}
		</Container>
	);
};
