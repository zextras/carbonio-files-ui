/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';
import { DefaultTheme } from 'styled-components';

import { DisplayerHeader } from './DisplayerHeader';
import { setup } from '../../tests/utils';
import { NodeType } from '../../types/graphql/types';
import 'jest-styled-components';

describe('Displayer Header', () => {
	test.each<
		[type: NodeType, mimeType: string | undefined, icon: keyof DefaultTheme['icons'], color: string]
	>([
		[NodeType.Folder, 'any', 'Folder', '#828282'],
		[NodeType.Text, 'application/pdf', 'FilePdf', '#d74942'],
		[NodeType.Text, 'any', 'FileText', '#2b73d2'],
		[NodeType.Video, 'any', 'Video', '#d74942'],
		[NodeType.Audio, 'any', 'Music', '#414141'],
		[NodeType.Image, 'any', 'Image', '#d74942'],
		[NodeType.Message, 'any', 'Email', '#2b73d2'],
		[NodeType.Presentation, 'any', 'FilePresentation', '#FFA726'],
		[NodeType.Spreadsheet, 'any', 'FileCalc', '#8bc34a'],
		[NodeType.Application, 'any', 'Code', '#414141'],
		[NodeType.Other, 'any', 'File', '#2b73d2']
	])(
		'node with type %s and mimetype %s show icon %s with color %s',
		(type, mimeType, icon, color) => {
			const closeActionFn = jest.fn();
			setup(
				<DisplayerHeader
					name={'name'}
					type={type}
					mimeType={mimeType}
					closeAction={closeActionFn}
				/>
			);
			expect(screen.getByTestId(`icon: ${icon}`)).toBeVisible();
			expect(screen.getByTestId(`icon: ${icon}`)).toHaveStyleRule('color', color);
		}
	);
});
