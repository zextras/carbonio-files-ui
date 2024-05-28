/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { keyBy } from 'lodash';

import { OverQuotaBanner } from './OverQuotaBanner';
import { uploadVar } from '../../apollo/uploadVar';
import { UPLOAD_STATUS_CODE } from '../../constants';
import { ICON_REGEXP } from '../../constants/test';
import { populateUploadItems } from '../../mocks/mockUtils';
import { screen, setup } from '../../tests/utils';
import { UploadStatus } from '../../types/graphql/client-types';

describe('OverQuotaBanner', () => {
	it('should render the banner if there is a failed item for over quota', () => {
		const uploadItemsInList = populateUploadItems(4, 'File');
		uploadVar(keyBy(uploadItemsInList, (uploadItem) => uploadItem.id));
		uploadItemsInList.forEach((item) => {
			item.status = UploadStatus.COMPLETED;
		});
		uploadItemsInList[0].status = UploadStatus.FAILED;
		uploadItemsInList[0].statusCode = UPLOAD_STATUS_CODE.overQuota;
		setup(<OverQuotaBanner />);
		expect(screen.getByTestId(ICON_REGEXP.alertQuota)).toBeVisible();
		expect(screen.getByText(/Quota exceeded/i)).toBeVisible();
		expect(
			screen.getByText(
				'The uploading of some items failed because you have reached your storage limit. Delete some items to free up storage space and try again.'
			)
		).toBeVisible();
	});

	it('should not render the banner if there is no failed item for over quota', () => {
		const uploadItemsInList = populateUploadItems(4, 'File');
		uploadVar(keyBy(uploadItemsInList, (uploadItem) => uploadItem.id));
		uploadItemsInList.forEach((item) => {
			item.status = UploadStatus.COMPLETED;
		});
		uploadItemsInList[0].status = UploadStatus.FAILED;
		setup(<OverQuotaBanner />);
		expect(screen.queryByTestId(ICON_REGEXP.alertQuota)).not.toBeInTheDocument();
		expect(screen.queryByText(/Quota exceeded/i)).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				'The uploading of some items failed because you have reached your storage limit. Delete some items to free up storage space and try again.'
			)
		).not.toBeInTheDocument();
	});
});
