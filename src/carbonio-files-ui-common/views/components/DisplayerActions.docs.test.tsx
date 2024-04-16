/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { DisplayerActions } from './DisplayerActions';
import server from '../../../mocks/server';
import { DOCS_SERVICE_NAME, HEALTH_PATH, REST_ENDPOINT } from '../../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { healthCache } from '../../hooks/useHealthInfo';
import { HealthResponse } from '../../mocks/handleHealthRequest';
import { populateFile, populateFolder, populateNodePage } from '../../mocks/mockUtils';
import { NodeType, User } from '../../types/graphql/types';
import { screen, setup } from '../../utils/testUtils';
import { docsHandledMimeTypes } from '../../utils/utils';

describe('Displayer Actions', () => {
	describe('docs actions', () => {
		it.each([
			['edit', ICON_REGEXP.edit, ACTION_REGEXP.editDocument, true],
			['open document', ICON_REGEXP.openDocument, ACTION_REGEXP.openDocument, false]
		])(
			'should show %s action if docs is available',
			async (_, actionIcon, actionName, writePermission) => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
					)
				);
				const parentFolder = populateFolder();
				parentFolder.permissions.can_write_file = true;
				parentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = writePermission;
				node.parent = parentFolder;
				node.owner = parentFolder.owner as User;
				node.type = NodeType.Text;
				[node.mime_type] = docsHandledMimeTypes;
				parentFolder.children = populateNodePage([node]);

				const { user } = setup(<DisplayerActions node={node} />);

				await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
				const actionButton = screen.queryByRoleWithIcon('button', { icon: actionIcon });
				if (actionButton !== null) {
					expect(actionButton).toBeVisible();
				} else {
					await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
					await screen.findByTestId(SELECTORS.dropdownList);
					expect(screen.getByText(actionName)).toBeVisible();
				}
			}
		);

		it.each([
			['edit', ICON_REGEXP.edit, ACTION_REGEXP.editDocument, true],
			['open document', ICON_REGEXP.openDocument, ACTION_REGEXP.openDocument, false]
		])(
			'should not show %s action if docs is not available',
			async (_, actionIcon, actionName, writePermission) => {
				healthCache.reset();
				server.use(
					http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
						HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: false }] })
					)
				);
				const parentFolder = populateFolder();
				parentFolder.permissions.can_write_file = true;
				parentFolder.permissions.can_write_folder = true;
				const node = populateFile();
				node.permissions.can_write_file = writePermission;
				node.parent = parentFolder;
				node.owner = parentFolder.owner as User;
				node.type = NodeType.Text;
				[node.mime_type] = docsHandledMimeTypes;
				parentFolder.children = populateNodePage([node]);

				const { user } = setup(<DisplayerActions node={node} />);

				await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
				expect(screen.queryByRoleWithIcon('button', { icon: actionIcon })).not.toBeInTheDocument();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.queryByText(actionName)).not.toBeInTheDocument();
			}
		);
	});
});
