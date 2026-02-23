/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';

import { UploadDisplayer } from './UploadDisplayer';
import * as useActiveNodeModule from '../../../hooks/useActiveNode';
import { uploadVar } from '../../apollo/uploadVar';
import { HTTP_STATUS_CODE } from '../../constants';
import { populateUploadItem } from '../../mocks/mockUtils';
import { setup, within } from '../../tests/utils';

describe('UploadDisplayer', () => {
	beforeEach(() => {
		uploadVar({});
	});

	it('renders UploadDisplayerNode when uploadItem exists', () => {
		const uploadItem = populateUploadItem({ name: 'test-file.txt' });
		uploadVar({ [uploadItem.id]: uploadItem });

		vi.spyOn(useActiveNodeModule, 'useActiveNode').mockReturnValue({
			activeNodeId: uploadItem.id,
			setActiveNode: vi.fn(),
			removeActiveNode: vi.fn(),
			isDetailsTab: false,
			isSharingTab: false,
			isVersioningTab: false,
			isExistingTab: false
		});

		setup(<UploadDisplayer />);
		const displayer = screen.getByTestId('DisplayerHeader');
		expect(within(displayer).getByText('test-file.txt')).toBeVisible();
	});

	describe('when there are failed uploads and there are no an active item', () => {
		it('shows UploadFailureEmptyDisplayer when there are uploads with handled error codes', () => {
			const uploadItem = populateUploadItem({
				id: 'test-id',
				statusCode: HTTP_STATUS_CODE.fileSizeExceeded
			});
			uploadVar({ [uploadItem.id]: uploadItem });

			setup(<UploadDisplayer />);

			expect(screen.getByText(/Upload suggestions/i)).toBeVisible();
			expect(screen.getByText(/Here you can find all the items/i)).toBeVisible();
		});

		it('shows EmptyDisplayer when there are no uploads with handled error codes', () => {
			const uploadItem = populateUploadItem({
				id: 'test-id',
				statusCode: HTTP_STATUS_CODE.overQuota
			});
			uploadVar({ [uploadItem.id]: uploadItem });

			setup(<UploadDisplayer />);

			expect(screen.queryByText(/Upload suggestions/i)).not.toBeInTheDocument();
			expect(screen.getByTestId('emptyDisplayer')).toBeVisible();
		});
	});

	describe('when there are no uploads', () => {
		it('shows EmptyDisplayer when uploadVar is empty', () => {
			uploadVar({});

			setup(<UploadDisplayer />);

			expect(screen.queryByText(/Upload suggestions/i)).not.toBeInTheDocument();
			expect(screen.getByTestId('emptyDisplayer')).toBeVisible();
		});
	});
});
