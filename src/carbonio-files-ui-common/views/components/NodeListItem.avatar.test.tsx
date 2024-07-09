/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import * as NodeAvatarIconModule from './NodeAvatarIcon';
import { NodeListItem } from './NodeListItem';
import server from '../../../mocks/server';
import {
	DOCS_SERVICE_NAME,
	HEALTH_PATH,
	PREVIEW_SERVICE_NAME,
	REST_ENDPOINT
} from '../../constants';
import { SELECTORS } from '../../constants/test';
import { healthCache } from '../../hooks/useHealthInfo';
import { HealthResponse } from '../../mocks/handleHealthRequest';
import { setup } from '../../tests/utils';
import { NodeType } from '../../types/graphql/types';
import * as previewUtils from '../../utils/previewUtils';

describe('Node List Item Avatar', () => {
	test('should call getPreviewThumbnailSrc and use it as Avatar picture when preview is live', async () => {
		healthCache.reset();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({
					dependencies: [
						{ name: PREVIEW_SERVICE_NAME, live: true },
						{ name: DOCS_SERVICE_NAME, live: true }
					]
				})
			)
		);
		const getPreviewThumbnailSrcFn = jest.spyOn(previewUtils, 'getPreviewThumbnailSrc');
		const NodeAvatarIconComponentFn = jest.spyOn(NodeAvatarIconModule, 'NodeAvatarIcon');

		setup(
			<NodeListItem
				id={'id'}
				name={'name'}
				type={NodeType.Image}
				mimeType={'image/gif'}
				version={1}
			/>
		);
		expect(await screen.findByTestId(SELECTORS.nodeAvatar)).toBeVisible();
		await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
		expect(getPreviewThumbnailSrcFn).toHaveBeenCalledTimes(1);
		expect(NodeAvatarIconComponentFn).toHaveBeenLastCalledWith(
			expect.objectContaining({
				picture: getPreviewThumbnailSrcFn.mock.results[0].value
			}),
			{}
		);
	});

	test('should not call getPreviewThumbnailSrc when preview is not live', async () => {
		healthCache.reset();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({
					dependencies: [
						{ name: PREVIEW_SERVICE_NAME, live: false },
						{ name: DOCS_SERVICE_NAME, live: true }
					]
				})
			)
		);
		const getPreviewThumbnailSrcFn = jest.spyOn(previewUtils, 'getPreviewThumbnailSrc');
		expect(healthCache.healthReceived).toBeFalsy();
		setup(
			<NodeListItem
				id={'id'}
				name={'name'}
				type={NodeType.Image}
				mimeType={'image/gif'}
				version={1}
			/>
		);
		expect(await screen.findByTestId(SELECTORS.nodeAvatar)).toBeVisible();
		await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
		expect(getPreviewThumbnailSrcFn).not.toHaveBeenCalled();
	});
});
