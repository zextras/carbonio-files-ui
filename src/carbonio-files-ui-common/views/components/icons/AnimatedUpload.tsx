/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { HTMLAttributes } from 'react';

import animatedUpload from '../../../assets/images/animated-upload.svg';

export const AnimatedUpload = (props: HTMLAttributes<HTMLObjectElement>): React.JSX.Element => (
	<object type="image/svg+xml" data={animatedUpload} {...props} style={{ pointerEvents: 'none' }}>
		animated-loader
	</object>
);
