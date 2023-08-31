/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, fireEvent, screen } from '@testing-library/react';

import { List } from './List';
import { PREVIEW_MAX_SIZE } from '../../constants';
import { ACTION_REGEXP, ICON_REGEXP } from '../../constants/test';
import { populateFile } from '../../mocks/mockUtils';
import { NodeType } from '../../types/graphql/types';
import { setup } from '../../utils/testUtils';

describe('Preview action', () => {
	test('Pdf with size greater than PREVIEW_MAX_SIZE are not previewed and fallback is shown', async () => {
		const file = populateFile();
		file.type = NodeType.Application;
		file.mime_type = 'application/pdf';
		file.size = PREVIEW_MAX_SIZE + 1;
		file.extension = 'pdf';
		const { user } = setup(<List nodes={[file]} mainList emptyListMessage="empty list" />);

		await screen.findByText(file.name);
		fireEvent.contextMenu(screen.getByText(file.name));
		await screen.findByText(ACTION_REGEXP.preview);
		await user.click(screen.getByText(ACTION_REGEXP.preview));
		// fallback is shown
		await screen.findByText(/This item cannot be displayed/i);
		expect(screen.getByText(/This item cannot be displayed/i)).toBeVisible();
		expect(screen.getByRole('button', { name: /download file/i })).toBeVisible();
		expect(screen.queryByText(/loading pdf/i)).not.toBeInTheDocument();
	});

	test('Pdf with size 0 is previewed', async () => {
		const file = populateFile();
		file.type = NodeType.Application;
		file.mime_type = 'application/pdf';
		file.size = 0;
		file.extension = 'pdf';
		const { user } = setup(<List nodes={[file]} mainList emptyListMessage="empty list" />);

		await screen.findByText(file.name);
		fireEvent.contextMenu(screen.getByText(file.name));
		await screen.findByText(ACTION_REGEXP.preview);
		await user.click(screen.getByText(ACTION_REGEXP.preview));
		// fallback is not shown
		await screen.findByText(/failed to load document preview/i);
		expect(screen.queryByText(/This item cannot be displayed/i)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /download file/i })).not.toBeInTheDocument();
	});

	test('Pdf with size lower than or equal to PREVIEW_MAX_SIZE is previewed', async () => {
		const file = populateFile();
		file.type = NodeType.Application;
		file.mime_type = 'application/pdf';
		file.size = PREVIEW_MAX_SIZE;
		file.extension = 'pdf';
		const { user } = setup(<List nodes={[file]} mainList emptyListMessage="empty list" />);

		await screen.findByText(file.name);
		fireEvent.contextMenu(screen.getByText(file.name));
		await screen.findByText(ACTION_REGEXP.preview);
		await user.click(screen.getByText(ACTION_REGEXP.preview));
		// fallback is not shown
		await screen.findByText(/failed to load document preview/i);
		expect(screen.queryByText(/This item cannot be displayed/i)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /download file/i })).not.toBeInTheDocument();
	});

	test.each([
		['image/png'],
		['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
		['application/vnd.oasis.opendocument.presentation'],
		['application/vnd.oasis.opendocument.spreadsheet'],
		['application/vnd.oasis.opendocument.text'],
		['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
		['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
		['application/pdf']
	])('context preview action is supported by mime type %s', async (mimeType) => {
		const file = populateFile();
		file.mime_type = mimeType;

		setup(<List nodes={[file]} mainList emptyListMessage="empty list" />);

		await screen.findByText(file.name);
		fireEvent.contextMenu(screen.getByText(file.name));
		expect(await screen.findByText(ACTION_REGEXP.preview)).toBeVisible();
	});

	test.each([['video/quicktime'], ['text/html'], ['image/svg+xml'], ['text/plain']])(
		'mime types %s does not support preview action',
		async (mimeType) => {
			const file = populateFile();
			file.mime_type = mimeType;

			setup(<List nodes={[file]} mainList={false} emptyListMessage="empty list" />);

			await screen.findByText(file.name);
			fireEvent.contextMenu(screen.getByText(file.name));
			act(() => {
				jest.runOnlyPendingTimers();
			});
			expect(screen.queryByText(ACTION_REGEXP.preview)).not.toBeInTheDocument();
		}
	);

	test.each([
		['application/vnd.openxmlformats-officedocument.wordprocessingml.document', true],
		['application/vnd.openxmlformats-officedocument.wordprocessingml.document', false],
		['application/vnd.oasis.opendocument.presentation', true],
		['application/vnd.oasis.opendocument.presentation', false],
		['application/vnd.oasis.opendocument.spreadsheet', true],
		['application/vnd.oasis.opendocument.spreadsheet', false],
		['application/vnd.oasis.opendocument.text', true],
		['application/vnd.oasis.opendocument.text', false],
		['application/vnd.openxmlformats-officedocument.presentationml.presentation', true],
		['application/vnd.openxmlformats-officedocument.presentationml.presentation', false],
		['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true],
		['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false]
	])(
		'Check that only docs with write permission have edit action in preview, otherwise in case of read permission, they have open document action',
		async (mimeType, canWriteFile) => {
			const file = populateFile();
			file.mime_type = mimeType;
			file.permissions.can_write_file = canWriteFile;

			const { user } = setup(<List nodes={[file]} mainList emptyListMessage="empty list" />);

			await screen.findByText(file.name);
			fireEvent.contextMenu(screen.getByText(file.name));
			expect(await screen.findByText(ACTION_REGEXP.preview)).toBeVisible();
			await user.click(screen.getByText(ACTION_REGEXP.preview));
			if (canWriteFile) {
				expect(screen.getByTestId(ICON_REGEXP.edit)).toBeVisible();
				expect(screen.queryByTestId(ICON_REGEXP.openDocument)).not.toBeInTheDocument();
			} else {
				expect(screen.getByTestId(ICON_REGEXP.openDocument)).toBeVisible();
				expect(screen.queryByTestId(ICON_REGEXP.edit)).not.toBeInTheDocument();
			}
		}
	);
});
