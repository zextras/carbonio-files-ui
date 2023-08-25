/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { List } from './List';
import { PREVIEW_MAX_SIZE } from '../../constants';
import { ACTION_REGEXP } from '../../constants/test';
import { populateFile, populateNodes } from '../../mocks/mockUtils';
import { File, NodeType } from '../../types/graphql/types';
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

	test('check if the context preview action is supported by mime type', async () => {
		const files = populateNodes(4, 'File') as File[];
		// create video file
		files[0].mime_type = 'video/quicktime';
		// create ODT file
		files[1].mime_type = 'application/vnd.oasis.opendocument.text';
		// create PPT
		files[2].mime_type =
			'application/vnd.openxmlformats-officedocument.presentationml.presentation';
		// create XLSX file
		files[3].mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

		setup(<List nodes={files} mainList emptyListMessage="empty list" />);

		await screen.findByText(files[0].name);
		await screen.findByText(files[1].name);
		fireEvent.contextMenu(screen.getByText(files[0].name));
		expect(screen.queryByText(ACTION_REGEXP.preview)).not.toBeInTheDocument();
		fireEvent.contextMenu(screen.getByText(files[1].name));
		expect(await screen.findByText(ACTION_REGEXP.preview)).toBeVisible();
		fireEvent.contextMenu(screen.getByText(files[2].name));
		expect(await screen.findByText(ACTION_REGEXP.preview)).toBeVisible();
		fireEvent.contextMenu(screen.getByText(files[3].name));
		expect(await screen.findByText(ACTION_REGEXP.preview)).toBeVisible();
	});
});
