/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Container } from '@zextras/carbonio-design-system';
import { intersection, throttle } from 'lodash';
import styled, { DefaultTheme } from 'styled-components';

import { DropzoneModal } from './DropzoneModal';
import { TIMERS } from '../../constants';

interface DropzoneProps {
	onDrop?: (event: React.DragEvent<HTMLElement>) => void;
	onDragOver?: (event: React.DragEvent<HTMLElement>) => void;
	onDragEnter?: (event: React.DragEvent<HTMLElement>) => void;
	onDragLeave?: (event: React.DragEvent<HTMLElement> | DragEvent) => void;
	disabled?: boolean;
	message?: string;
	title?: string;
	icons?: string[];
	effect: 'link' | 'none' | 'copy' | 'move';
	children: (dragging: boolean) => React.JSX.Element;
	types: string[];
}

const DropzoneContainer = styled(Container)`
	position: relative;
`;

const ContentContainer = styled(Container)<{ $dragging?: boolean; $disabled?: boolean }>`
	opacity: ${({ $dragging, $disabled }): number => ($dragging && $disabled ? 0.6 : 1)};
`;

const DropzoneOverlay = styled(Container)<{ $borderSize: keyof DefaultTheme['sizes']['padding'] }>`
	position: absolute;
	opacity: 0.4;
	border-radius: 0.25rem;
	height: auto;
	width: auto;
	top: ${({ theme, $borderSize }): string => theme.sizes.padding[$borderSize]};
	bottom: ${({ theme, $borderSize }): string => theme.sizes.padding[$borderSize]};
	left: ${({ theme, $borderSize }): string => theme.sizes.padding[$borderSize]};
	right: ${({ theme, $borderSize }): string => theme.sizes.padding[$borderSize]};
	pointer-events: none;
`;

export const Dropzone = ({
	children,
	onDrop,
	onDragEnter,
	onDragLeave,
	onDragOver,
	disabled,
	message = '',
	title = '',
	icons = [],
	effect,
	types
}: DropzoneProps): React.JSX.Element => {
	const [dragging, setDragging] = useState(false);
	const dropzoneRef = useRef<HTMLDivElement>(null);
	const showDropzoneTimer = useRef<NodeJS.Timeout | null>(null);
	const hideDropzoneTimer = useRef<NodeJS.Timeout | null>(null);

	const throttledDragOverHandler = useMemo(
		() =>
			throttle(
				() => {
					setDragging(true);
				},
				TIMERS.DRAG_THROTTLE,
				{ leading: false }
			),
		[]
	);

	const hideDropzone = useCallback(() => {
		// reset timers
		showDropzoneTimer.current && clearTimeout(showDropzoneTimer.current);
		showDropzoneTimer.current = null;
		throttledDragOverHandler.cancel();
		hideDropzoneTimer.current && clearTimeout(hideDropzoneTimer.current);
		hideDropzoneTimer.current = null;
		// update state
		setDragging(false);
	}, [throttledDragOverHandler]);

	const dragOverHandler = useCallback<React.DragEventHandler<HTMLElement>>(
		(event: React.DragEvent<HTMLElement>) => {
			if (intersection(event.dataTransfer.types, types).length > 0) {
				if (!event.defaultPrevented) {
					event.dataTransfer.dropEffect = disabled ? 'none' : effect;
					event.dataTransfer.effectAllowed = disabled ? 'none' : effect;
					throttledDragOverHandler();
					onDragOver?.(event);
					event.preventDefault();
				} else if (showDropzoneTimer.current) {
					hideDropzone();
				}
			}
		},
		[disabled, effect, hideDropzone, onDragOver, throttledDragOverHandler, types]
	);

	const dragEnterHandler = useCallback<React.DragEventHandler<HTMLElement>>(
		(event) => {
			if (intersection(event.dataTransfer.types, types).length > 0) {
				if (!event.defaultPrevented) {
					event.dataTransfer.dropEffect = disabled ? 'none' : effect;
					event.dataTransfer.effectAllowed = disabled ? 'none' : effect;
					showDropzoneTimer.current && clearTimeout(showDropzoneTimer.current);
					showDropzoneTimer.current = setTimeout(() => {
						setDragging(true);
					}, TIMERS.SHOW_DROPZONE);
					onDragEnter?.(event);
					event.preventDefault();
				} else if (showDropzoneTimer.current) {
					hideDropzone();
				}
			}
		},
		[disabled, effect, hideDropzone, onDragEnter, types]
	);

	const dragLeaveAction = useCallback(
		(event: DragEvent | React.DragEvent<HTMLElement>) => {
			onDragLeave?.(event);
			hideDropzone();
		},
		[hideDropzone, onDragLeave]
	);

	const dragLeaveHandler = useCallback<React.DragEventHandler<HTMLElement>>(
		(event) => {
			if (intersection(event.dataTransfer.types, types).length > 0) {
				event.preventDefault();
				const leavingNode = !(
					event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
				);
				if (leavingNode) {
					dragLeaveAction(event);
				}
			}
		},
		[dragLeaveAction, types]
	);

	const dropHandler = useCallback<React.DragEventHandler<HTMLElement>>(
		(event) => {
			if (!event.defaultPrevented && intersection(event.dataTransfer.types, types).length > 0) {
				event.preventDefault();
				hideDropzone();
				onDrop?.(event);
			}
		},
		[hideDropzone, onDrop, types]
	);

	const dragEnterOtherListener = useCallback(
		(event: DragEvent) => {
			if (
				!hideDropzoneTimer.current &&
				!(event.target instanceof Node && dropzoneRef.current?.contains(event.target))
			) {
				hideDropzoneTimer.current = setTimeout(() => {
					dragLeaveAction(event);
				}, TIMERS.HIDE_DROPZONE);
			}
		},
		[dragLeaveAction]
	);

	useEffect(() => {
		if (dragging) {
			// since some dragLeave event are not fired, if the dropzone is active add a listener to
			// intercept drag enter events on other elements, to simulate the drag leave event on this dropzone
			window.addEventListener('dragenter', dragEnterOtherListener);
		}

		return (): void => {
			window.removeEventListener('dragenter', dragEnterOtherListener);
		};
	}, [dragEnterOtherListener, dragging]);

	useEffect(
		() =>
			// cancel all the delayed callback when the component unmount
			(): void => {
				throttledDragOverHandler.cancel();
				showDropzoneTimer.current && clearTimeout(showDropzoneTimer.current);
				hideDropzoneTimer.current && clearTimeout(hideDropzoneTimer.current);
			},
		[throttledDragOverHandler]
	);

	return (
		<DropzoneContainer
			onDrop={dropHandler}
			onDragOver={dragOverHandler}
			onDragEnter={dragEnterHandler}
			onDragLeave={dragLeaveHandler}
			minHeight="0"
			mainAlignment="flex-start"
			ref={dropzoneRef}
		>
			<ContentContainer $disabled={disabled} $dragging={dragging} mainAlignment="flex-start">
				{children(dragging)}
			</ContentContainer>
			{dragging && (
				<>
					<DropzoneOverlay
						background={disabled ? 'secondary' : 'primary'}
						$borderSize={title || message ? 'small' : 'extrasmall'}
						data-testid="dropzone-overlay"
					/>
					{(title || message) && (
						<DropzoneModal title={title} message={message} disabled={disabled} icons={icons} />
					)}
				</>
			)}
		</DropzoneContainer>
	);
};
