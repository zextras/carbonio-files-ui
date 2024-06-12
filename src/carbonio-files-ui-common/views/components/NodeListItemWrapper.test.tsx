/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { NodeListItemWrapper } from './NodeListItemWrapper';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import * as useHealthInfo from '../../hooks/useHealthInfo';
import * as usePreview from '../../hooks/usePreview';
import { populateFile, populateNode } from '../../mocks/mockUtils';
import { PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS } from '../../utils/previewUtils';
import { setup } from '../../utils/testUtils';
import * as utils from '../../utils/utils';

describe('NodeListItemWrapper', () => {
	describe('hover actions', () => {
		test('click on flag action changes flag icon visibility', async () => {
			const node = populateNode();
			node.flagged = false;

			const toggleFlag = jest.fn((value, item) => {
				if (item.id === node.id) {
					node.flagged = value;
				}
			});

			const { user } = setup(<NodeListItemWrapper node={node} toggleFlag={toggleFlag} />);
			expect(screen.queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
			await user.click(screen.getByTestId(ICON_REGEXP.flag));
			expect(toggleFlag).toHaveBeenCalledTimes(1);
			expect(node.flagged).toBeTruthy();
		});

		test('click on unflag action changes flag icon visibility', async () => {
			const node = populateNode();
			node.flagged = true;

			const toggleFlag = jest.fn((value, item) => {
				if (item.id === node.id) {
					node.flagged = value;
				}
			});

			const { user } = setup(<NodeListItemWrapper node={node} toggleFlag={toggleFlag} />);
			expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.unflag));
			expect(toggleFlag).toHaveBeenCalledTimes(1);
			expect(node.flagged).toBeFalsy();
		});
	});

	describe('double click behaviour', () => {
		it.each([
			['open with docs', true, true, true, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['do nothing', true, false, true, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['open with docs', false, true, true, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['do nothing', false, false, true, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['open preview', true, true, false, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['do nothing', true, false, false, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['open with docs', false, true, false, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['do nothing', false, false, false, PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS[0]],
			['open preview', true, true, true, 'application/pdf'],
			['open preview', true, false, true, 'application/pdf'],
			['do nothing', false, true, true, 'application/pdf'],
			['do nothing', false, false, true, 'application/pdf'],
			['open preview', true, true, false, 'application/pdf'],
			['open preview', true, false, false, 'application/pdf'],
			['do nothing', false, true, false, 'application/pdf'],
			['do nothing', false, false, false, 'application/pdf'],
			['open preview', true, true, true, 'image/png'],
			['open preview', true, false, true, 'image/png'],
			['do nothing', false, true, true, 'image/png'],
			['do nothing', false, false, true, 'image/png'],
			['open preview', true, true, false, 'image/png'],
			['open preview', true, false, false, 'image/png'],
			['do nothing', false, true, false, 'image/png'],
			['do nothing', false, false, false, 'image/png']
		])(
			`should %s when canUsePreview is %s, canUseDocs is %s, canWriteFile is %s, mime_type is %s `,
			async (action, canUsePreview, canUseDocs, canWriteFile, mimeType) => {
				const openWithDocsFn = jest.spyOn(utils, 'openNodeWithDocs');
				const openPreview = jest.fn();

				jest.spyOn(usePreview, 'usePreview').mockReturnValue({
					openPreview,
					initPreview: () => undefined,
					emptyPreview: () => undefined,
					createPreview: () => undefined
				});

				jest.spyOn(useHealthInfo, 'useHealthInfo').mockReturnValue({
					canUsePreview,
					canUseDocs
				});

				const node = populateFile();
				node.permissions.can_write_file = canWriteFile;
				node.mime_type = mimeType;

				const { user } = setup(<NodeListItemWrapper node={node} toggleFlag={() => undefined} />);

				await user.dblClick(screen.getByTestId(SELECTORS.nodeItem(node.id)));
				if (action === 'open with docs') {
					expect(openPreview).not.toHaveBeenCalled();
					expect(openWithDocsFn).toHaveBeenCalled();
				} else if (action === 'open preview') {
					expect(openPreview).toHaveBeenCalled();
					expect(openWithDocsFn).not.toHaveBeenCalled();
				} else if (action === 'do nothing') {
					expect(openPreview).not.toHaveBeenCalled();
					expect(openWithDocsFn).not.toHaveBeenCalled();
				} else {
					throw new Error('Unhandled');
				}
			}
		);
	});
});
