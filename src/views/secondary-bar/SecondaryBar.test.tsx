/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, screen } from '@testing-library/react';
import { keyBy } from 'lodash';

import { SecondaryBar } from './SecondaryBar';
import { uploadVar } from '../../carbonio-files-ui-common/apollo/uploadVar';
import { ROOTS } from '../../carbonio-files-ui-common/constants';
import { ICON_REGEXP } from '../../carbonio-files-ui-common/constants/test';
import {
	populateUploadItem,
	populateUploadItems
} from '../../carbonio-files-ui-common/mocks/mockUtils';
import { UploadStatus } from '../../carbonio-files-ui-common/types/graphql/client-types';
import { setup } from '../../carbonio-files-ui-common/utils/testUtils';

describe('SecondaryBar', () => {
	describe('Upload item', () => {
		test('should render the upload item without the badge', () => {
			setup(<SecondaryBar expanded />);
			expect(screen.getByText(/uploads/i)).toBeVisible();
			expect(screen.queryByText('0/0')).not.toBeInTheDocument();
		});

		test('the badge appears when an upload is added', () => {
			const uploadItem = populateUploadItem({
				status: UploadStatus.LOADING,
				parentNodeId: ROOTS.LOCAL_ROOT
			});
			uploadVar({ [uploadItem.id]: uploadItem });
			setup(<SecondaryBar expanded />);
			expect(screen.getByText('0/1')).toBeVisible();
		});
		test('the badge shows the number of completed item on the total number of items', () => {
			const uploadItems = populateUploadItems(4);
			uploadItems[0].status = UploadStatus.LOADING;
			uploadItems[1].status = UploadStatus.COMPLETED;
			uploadItems[2].status = UploadStatus.QUEUED;
			uploadItems[3].status = UploadStatus.FAILED;
			uploadVar(keyBy(uploadItems, (item) => item.id));
			setup(<SecondaryBar expanded />);
			expect(screen.getByText('1/4')).toBeVisible();
			act(() => {
				uploadVar({
					...uploadVar(),
					[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
				});
			});
			expect(screen.getByText('2/4')).toBeVisible();
		});
		test('should render an icon alert if an upload fails', () => {
			const uploadItems = populateUploadItems(4);
			uploadItems[0].status = UploadStatus.FAILED;
			uploadVar(keyBy(uploadItems, (item) => item.id));
			setup(<SecondaryBar expanded />);
			expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
			act(() => {
				uploadVar({
					...uploadVar(),
					[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
				});
			});
			expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
		});
	});
});
