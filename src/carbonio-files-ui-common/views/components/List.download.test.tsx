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
	CONFIGS,
	DOWNLOAD_MULTIPLE_PATH,
	DOWNLOAD_PATH_CHECK,
	HTTP_STATUS_CODE,
	REST_ENDPOINT
} from '../../constants';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateConfigs, populateFolder } from '../../mocks/mockUtils';
import { screen, selectNodes, setup, within } from '../../tests/utils';
import { File, Folder } from '../../types/graphql/types';
import { mockGetConfigs } from '../../utils/resolverMocks';
import * as utils from '../../utils/utils';
import { humanFileSizeFromMB } from '../../utils/utils';

vi.mock('./VirtualizedNodeListItem');
vi.mock('./HeaderBreadcrumbs');

describe('List download', () => {
	it('should call the DownloadMultipleNodes when the user selects multiple nodes and clicks on download button', async () => {
		const downloadMultipleNodesFn = vi.spyOn(utils, 'downloadMultipleNodes');

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
		const maxDownloadSize = 2000;

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(
					populateConfigs({
						[CONFIGS.MAX_DOWNLOAD_SIZE]: `${maxDownloadSize}`
					})
				)
			}
		};

		const { user } = setup(
			<SelectionProvider items={nodes as (File | Folder)[]}>
				<List
					nodes={nodes as (File | Folder)[]}
					mainList
					emptyListMessage={'hint'}
					folderId={currentFolder.id}
				/>
			</SelectionProvider>,
			{ mocks }
		);

		await screen.findByText(node1.name);
		await selectNodes([node1.id, node2.id], user);
		const downloadButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.download });
		expect(downloadButton).toBeVisible();
		await user.click(downloadButton);
		const snackbar = await screen.findByTestId(SELECTORS.snackbar);
		expect(
			within(snackbar).getByText(
				`Download size exceeds the ${humanFileSizeFromMB(maxDownloadSize, undefined)} limit. Please reduce items to download`
			)
		).toBeVisible();
	});
});
