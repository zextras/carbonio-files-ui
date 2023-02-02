/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { PREVIEW_MAX_SIZE } from '../../constants';
import { ACTION_REGEXP } from '../../constants/test';
import { populateFile } from '../../mocks/mockUtils';
import { NodeType } from '../../types/graphql/types';
import { setup } from '../../utils/testUtils';
import { List } from './List';

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
});
