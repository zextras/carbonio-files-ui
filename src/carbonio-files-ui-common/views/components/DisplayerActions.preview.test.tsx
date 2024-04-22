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
import { HEALTH_PATH, PREVIEW_SERVICE_NAME, REST_ENDPOINT } from '../../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { healthCache } from '../../hooks/useHealthInfo';
import { HealthResponse } from '../../mocks/handleHealthRequest';
import { populateFile, populateFolder, populateNodePage } from '../../mocks/mockUtils';
import { NodeType, User } from '../../types/graphql/types';
import { screen, setup } from '../../utils/testUtils';

describe('Displayer Actions', () => {
	describe('preview action', () => {
		it('should show preview action if preview is available', async () => {
			healthCache.reset();
			server.use(
				http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
					HttpResponse.json({ dependencies: [{ name: PREVIEW_SERVICE_NAME, live: true }] })
				)
			);
			const parentFolder = populateFolder();
			parentFolder.permissions.can_write_file = true;
			parentFolder.permissions.can_write_folder = true;
			const node = populateFile();
			node.permissions.can_write_file = true;
			node.parent = parentFolder;
			node.owner = parentFolder.owner as User;
			node.type = NodeType.Text;
			node.mime_type = 'application/pdf';
			parentFolder.children = populateNodePage([node]);

			const { user } = setup(<DisplayerActions node={node} />);
			await screen.findByTestId(SELECTORS.displayerActionsHeader);
			await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
			const actionButton = screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.preview });
			if (actionButton !== null) {
				expect(actionButton).toBeVisible();
			} else {
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.preview)).toBeVisible();
			}
		});

		it('should not show preview action if preview is not available', async () => {
			healthCache.reset();
			server.use(
				http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
					HttpResponse.json({ dependencies: [{ name: PREVIEW_SERVICE_NAME, live: false }] })
				)
			);
			const parentFolder = populateFolder();
			parentFolder.permissions.can_write_file = true;
			parentFolder.permissions.can_write_folder = true;
			const node = populateFile();
			node.permissions.can_write_file = true;
			node.parent = parentFolder;
			node.owner = parentFolder.owner as User;
			node.type = NodeType.Text;
			node.mime_type = 'application/pdf';
			parentFolder.children = populateNodePage([node]);

			const { user } = setup(<DisplayerActions node={node} />);
			await screen.findByTestId(SELECTORS.displayerActionsHeader);
			await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.preview })
			).not.toBeInTheDocument();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			await screen.findByTestId(SELECTORS.dropdownList);
			expect(screen.queryByText(ACTION_REGEXP.preview)).not.toBeInTheDocument();
		});
	});
});
