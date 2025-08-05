/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { http, HttpResponse } from 'msw';

import { List } from './List';
import { SelectionProvider } from './SelectionProvider';
import server from '../../../mocks/server';
import {
	DOWNLOAD_MULTIPLE_PATH,
	DOWNLOAD_PATH_CHECK,
	HTTP_STATUS_CODE,
	REST_ENDPOINT
} from '../../constants';
import { ICON_REGEXP } from '../../constants/test';
import * as useDownloadNodes from '../../hooks/useDownloadNodes';
import { populateFolder } from '../../mocks/mockUtils';
import { screen, selectNodes, setup } from '../../tests/utils';
import { File, Folder } from '../../types/graphql/types';

jest.mock<typeof import('./VirtualizedNodeListItem')>('./VirtualizedNodeListItem');

describe('List download', () => {
	it('should call the DownloadMultipleNodes when the user selects multiple nodes and clicks on download button', async () => {
		const downloadNodeFn = jest.fn();
		const downloadMultipleNodesFn = jest.fn();
		jest.spyOn(useDownloadNodes, 'useDownloadNodes').mockReturnValue({
			downloadNode: downloadNodeFn,
			downloadMultipleNodes: downloadMultipleNodesFn
		});

		const currentFolder = populateFolder(3);
		const { nodes } = currentFolder.children;
		const node1 = nodes[0]!;
		const node2 = nodes[1]!;
		const { user } = setup(
			<SelectionProvider items={nodes as (File | Folder)[]}>
				<List
					nodes={nodes as (File | Folder)[]}
					mainList
					emptyListMessage={'hint'}
					folderId={currentFolder.id}
				/>
			</SelectionProvider>
		);

		await screen.findByText(node1.name);
		await selectNodes([node1.id, node2.id], user);
		const downloadButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.download });
		expect(downloadButton).toBeVisible();
		await user.click(downloadButton);
		expect(downloadMultipleNodesFn).toHaveBeenCalledWith([node1.id, node2.id]);
	});

	it('should render a snackbar if the download fails due to 413', async () => {
		server.use(
			http.post(`${REST_ENDPOINT}${DOWNLOAD_MULTIPLE_PATH}${DOWNLOAD_PATH_CHECK}`, () =>
				HttpResponse.json(null, { status: HTTP_STATUS_CODE.fileSizeExceeded })
			)
		);
		const currentFolder = populateFolder(3);
		const { nodes } = currentFolder.children;
		const node1 = nodes[0]!;
		const node2 = nodes[1]!;
		const { user } = setup(
			<SelectionProvider items={nodes as (File | Folder)[]}>
				<List
					nodes={nodes as (File | Folder)[]}
					mainList
					emptyListMessage={'hint'}
					folderId={currentFolder.id}
				/>
			</SelectionProvider>
		);

		await screen.findByText(node1.name);
		await selectNodes([node1.id, node2.id], user);
		const downloadButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.download });
		expect(downloadButton).toBeVisible();
		await user.click(downloadButton);
		expect(
			await screen.findByText(/Download size exceeds limit. Reduce selection to download./i)
		).toBeVisible();
	});
});
