/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Container } from '@zextras/carbonio-design-system';
import { intersection } from 'lodash';

import { DRAG_TYPES } from '../../constants';

const preventDefaultDrop = (event: React.DragEvent): void => {
	const dragTypes = [DRAG_TYPES.upload];
	if (intersection(event.dataTransfer.types, dragTypes).length > 0) {
		event.preventDefault();
	}
};

const preventDefaultDrag = (event: React.DragEvent): void => {
	const dragTypes = [DRAG_TYPES.upload];
	// I'm sure there is a better way to check that the event is not handled by some
	// other listener
	if (
		intersection(event.dataTransfer.types, dragTypes).length > 0 &&
		(event.dataTransfer.dropEffect === 'none' || // chrome check
			event.dataTransfer.effectAllowed === 'uninitialized') // firefox check
	) {
		event.dataTransfer.dropEffect = 'none';
		event.dataTransfer.effectAllowed = 'none';
		event.preventDefault();
	}
};

export const PreventDefaultDropContainer: React.FC = ({ children }) => (
	<Container
		onDragEnter={preventDefaultDrag}
		onDragOver={preventDefaultDrag}
		onDrop={preventDefaultDrop}
	>
		{children}
	</Container>
);
