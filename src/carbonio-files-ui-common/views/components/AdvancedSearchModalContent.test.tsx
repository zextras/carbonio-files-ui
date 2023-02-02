/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, screen, waitFor, within } from '@testing-library/react';

import { ROOTS } from '../../constants';
import { SELECTORS } from '../../constants/test';
import { populateFolder } from '../../mocks/mockUtils';
import { AdvancedFilters } from '../../types/common';
import { NodeType } from '../../types/graphql/types';
import { ContactInfo } from '../../types/network';
import { mockGetPath } from '../../utils/mockUtils';
import { setup } from '../../utils/testUtils';
import { AdvancedSearchModalContent } from './AdvancedSearchModalContent';

const mockedSoapFetch: jest.Mock = jest.fn();

jest.mock('../../../network/network', () => ({
	soapFetch: jest.fn(
		(): Promise<unknown> =>
			new Promise((resolve, reject) => {
				const result = mockedSoapFetch();
				result ? resolve(result) : reject(new Error('no result provided'));
			})
	)
}));
describe('Advanced search modal content', () => {
	test('Render all the advanced params empty if no previous filter was set', () => {
		const filters = {};
		const closeAction = jest.fn();
		const searchAdvancedFilters = jest.fn();
		setup(
			<AdvancedSearchModalContent
				filters={filters}
				closeAction={closeAction}
				searchAdvancedFilters={searchAdvancedFilters}
			/>,
			{ mocks: [] }
		);
		expect(screen.getByText(/advanced filters/i)).toBeVisible();
		expect(screen.getByText(/^flagged/i)).toBeVisible();
		expect(screen.getByText(/filter the results by items that you've flagged/i)).toBeVisible();
		expect(screen.getByText(/^shared/i)).toBeVisible();
		expect(
			screen.getByText(
				/filter the results by items that contain at least one collaborator besides you/i
			)
		).toBeVisible();
		expect(screen.getByText(/keywords/i)).toBeVisible();
		expect(screen.getByText(/owner/i)).toBeVisible();
		expect(screen.getByText(/item type/i)).toBeVisible();
		expect(screen.getByText(/select a folder/i)).toBeVisible();
		expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
		expect(screen.getByRole('button', { name: /reset filters/i })).toBeVisible();
		expect(screen.getByRole('button', { name: /reset filters/i })).not.toHaveAttribute(
			'disabled',
			''
		);
		expect(screen.getByRole('button', { name: /search/i })).toBeVisible();
		expect(screen.getByRole('button', { name: /search/i })).toHaveAttribute('disabled', '');
		// only 1 icon close means no chips
		expect(screen.getByTestId('icon: Close')).toBeVisible();
	});

	test('Render all the advanced params with values if previous filter was set', () => {
		const filters: AdvancedFilters = {
			folderId: {
				value: ROOTS.LOCAL_ROOT,
				label: 'Home',
				avatarIcon: 'Folder'
			},
			cascade: {
				value: true
			},
			flagged: {
				value: true,
				label: 'Flagged',
				avatarIcon: 'Flag'
			},
			sharedByMe: {
				label: 'Shared',
				value: true,
				avatarIcon: 'Share'
			},
			keywords: [
				{
					value: 'keyword1',
					label: 'keyword1',
					hasAvatar: false
				},
				{
					value: 'keyword2',
					label: 'keyword2',
					hasAvatar: false
				}
			],
			ownerId: {
				avatarBackground: 'secondary',
				label: 'Name Surname',
				value: '12345678-1234-1234-1234-abcdeabcde12'
			},
			type: {
				avatarBackground: 'secondary',
				avatarIcon: 'Folder',
				label: 'Folder',
				value: NodeType.Folder
			}
		};
		const closeAction = jest.fn();
		const searchAdvancedFilters = jest.fn();
		setup(
			<AdvancedSearchModalContent
				filters={filters}
				closeAction={closeAction}
				searchAdvancedFilters={searchAdvancedFilters}
			/>,
			{ mocks: [] }
		);
		expect(screen.getByText(/advanced filters/i)).toBeVisible();
		expect(screen.getByText(/^flagged/i)).toBeVisible();
		expect(screen.getByText(/filter the results by items that you've flagged/i)).toBeVisible();
		expect(screen.getByText(/^shared/i)).toBeVisible();
		expect(
			screen.getByText(
				/filter the results by items that contain at least one collaborator besides you/i
			)
		).toBeVisible();
		expect(screen.getByText(/keywords/i)).toBeVisible();
		expect(screen.getByText(/select a folder/i)).toBeVisible();
		expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
		expect(screen.getByRole('button', { name: /reset filters/i })).toBeVisible();
		expect(screen.getByRole('button', { name: /reset filters/i })).not.toHaveAttribute(
			'disabled',
			''
		);
		expect(screen.getByRole('button', { name: /search/i })).toBeVisible();
		expect(screen.getByRole('button', { name: /search/i })).toHaveAttribute('disabled', '');

		// check values
		// flag and shared switches are on
		expect(screen.getAllByTestId('icon: ToggleRight')).toHaveLength(2);
		expect(screen.queryByTestId('icon: ToggleLeftOutline')).not.toBeInTheDocument();
		expect(screen.getByText(/\bkeyword1\b/)).toBeVisible();
		expect(screen.getByText(/\bkeyword2\b/)).toBeVisible();
		expect(screen.getByText(/\bHome\b/)).toBeVisible();
		expect(screen.getAllByTestId('icon: Folder')).toHaveLength(2);

		// owner chip
		expect(screen.getByText('Name Surname')).toBeVisible();
		// item type chip
		expect(screen.getByText('Folder')).toBeVisible();

		// 4 close icons: 2 keywords, 1 folder, 1 close modal, 1 item type, 1 owner
		expect(screen.getAllByTestId('icon: Close')).toHaveLength(6);
	});

	test('reset action clears all the filters', async () => {
		const filters: AdvancedFilters = {
			folderId: {
				value: ROOTS.LOCAL_ROOT,
				label: 'Home',
				avatarIcon: 'Folder'
			},
			cascade: {
				value: true
			},
			flagged: {
				value: true,
				label: 'Flagged',
				avatarIcon: 'Flag'
			},
			sharedByMe: {
				label: 'Shared',
				value: true,
				avatarIcon: 'Share'
			},
			keywords: [
				{
					value: 'keyword1',
					label: 'keyword1',
					hasAvatar: false
				},
				{
					value: 'keyword2',
					label: 'keyword2',
					hasAvatar: false
				}
			],
			ownerId: {
				avatarBackground: 'secondary',
				label: 'Name Surname',
				value: '12345678-1234-1234-1234-abcdeabcde12'
			},
			type: {
				avatarBackground: 'secondary',
				avatarIcon: 'Folder',
				label: 'Folder',
				value: NodeType.Folder
			}
		};
		const closeAction = jest.fn();
		const searchAdvancedFilters = jest.fn();
		const { user } = setup(
			<AdvancedSearchModalContent
				filters={filters}
				closeAction={closeAction}
				searchAdvancedFilters={searchAdvancedFilters}
			/>,
			{ mocks: [] }
		);
		// check values
		// flag and shared switches are on
		expect(screen.getAllByTestId('icon: ToggleRight')).toHaveLength(2);
		expect(screen.queryByTestId('icon: ToggleLeftOutline')).not.toBeInTheDocument();
		expect(screen.getByText(/\bkeyword1\b/)).toBeVisible();
		expect(screen.getByText(/\bkeyword2\b/)).toBeVisible();
		expect(screen.getByText(/\bHome\b/)).toBeVisible();
		expect(screen.getAllByTestId('icon: Folder')).toHaveLength(2);

		expect(screen.getAllByTestId('icon: Folder')[0]).toBeVisible();
		expect(screen.getAllByTestId('icon: Folder')[1]).toBeVisible();

		// owner chip
		expect(screen.getByText('Name Surname')).toBeVisible();
		// item type chip
		expect(screen.getByText('Folder')).toBeVisible();

		// 4 close icons: 2 keywords, 1 folder, 1 close modal, 1 owner, 1 item type
		expect(screen.getAllByTestId('icon: Close')).toHaveLength(6);

		const resetButton = screen.getByRole('button', { name: /reset filters/i });
		const searchButton = screen.getByRole('button', { name: /search/i });
		expect(resetButton).toBeVisible();
		expect(resetButton).not.toHaveAttribute('disabled', '');
		expect(searchButton).toBeVisible();
		expect(searchButton).toHaveAttribute('disabled', '');

		// change 1 param to enable search button
		await user.click(screen.getByText(/^flagged/i));
		await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
		await user.click(resetButton);
		await waitFor(() => expect(searchButton).toHaveAttribute('disabled', ''));
		// flag and shared switches are off
		expect(screen.getAllByTestId('icon: ToggleLeftOutline')).toHaveLength(2);
		expect(screen.queryByTestId('icon: ToggleRight')).not.toBeInTheDocument();
		expect(screen.queryByText(/\bkeyword1\b/)).not.toBeInTheDocument();
		expect(screen.queryByText(/\bkeyword2\b/)).not.toBeInTheDocument();
		expect(screen.queryByText(/\bHome\b/)).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Folder')).not.toBeInTheDocument();
		expect(screen.queryByText('Name Surname')).not.toBeInTheDocument();
		expect(screen.queryByText('Folder')).not.toBeInTheDocument();

		// 1 close icon: close modal
		expect(screen.getByTestId('icon: Close')).toBeVisible();
		await user.click(screen.getByRole('button', { name: /search/i }));
		expect(searchAdvancedFilters).not.toHaveBeenCalled();
	});

	test('close modal does not run search', async () => {
		const filters = {};
		const closeAction = jest.fn();
		const searchAdvancedFilters = jest.fn();
		const { user } = setup(
			<AdvancedSearchModalContent
				filters={filters}
				closeAction={closeAction}
				searchAdvancedFilters={searchAdvancedFilters}
			/>,
			{ mocks: [] }
		);
		expect(screen.getByText(/^flagged/i)).toBeVisible();
		const searchButton = screen.getByRole('button', { name: /search/i });
		expect(searchButton).toHaveAttribute('disabled', '');
		await user.click(screen.getByText(/^flagged/i));
		await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
		expect(screen.getByTestId('icon: Close')).toBeVisible();
		await user.click(screen.getByTestId('icon: Close'));
		expect(closeAction).toHaveBeenCalled();
		expect(searchAdvancedFilters).not.toHaveBeenCalled();
	});

	describe('keywords param', () => {
		test('in keywords input comma, semicolon and tab are the splitter for the keywords. Space has its default behaviour', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			// 1 close icon: close modal one
			expect(screen.getByTestId('icon: Close')).toBeVisible();
			const searchButton = screen.getByRole('button', { name: /search/i });
			expect(searchButton).toBeVisible();
			expect(searchButton).toHaveAttribute('disabled', '');
			const inputElement = screen.getByRole('textbox', { name: /keywords/i });
			expect(screen.getByText(/keywords/i)).toBeVisible();
			// create chip with comma
			await user.type(inputElement, 'keyword1');
			expect(inputElement).toHaveValue('keyword1');
			await user.type(inputElement, ',');
			// 2 close icons: 1 chip and modal
			await waitFor(() => expect(screen.getAllByTestId('icon: Close')).toHaveLength(2));
			// search button becomes enabled
			await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
			expect(screen.getByText('keyword1')).toBeVisible();
			// space does not create a chip
			await user.type(inputElement, 'keyword[Space]2');
			expect(inputElement).toHaveDisplayValue(['keyword 2']);
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			// create chip with semicolon
			await user.type(inputElement, ';');
			// 3 close icons: 2 chips and modal
			await waitFor(() => expect(screen.getAllByTestId('icon: Close')).toHaveLength(3));
			expect(screen.getByText('keyword1')).toBeVisible();
			expect(screen.getByText('keyword 2')).toBeVisible();
			// create chip with tab
			await user.type(inputElement, 'keyword3');
			await user.tab();
			// 4 close icons: 3 chips and modal
			await waitFor(() => expect(screen.getAllByTestId('icon: Close')).toHaveLength(4));
			expect(screen.getByText('keyword1')).toBeVisible();
			expect(screen.getByText('keyword 2')).toBeVisible();
			expect(screen.getByText('keyword3')).toBeVisible();
			// create chip with blur
			await user.type(inputElement, 'keyword4');
			await user.click(searchButton);
			// 5 close icons: 4 chips and modal
			await waitFor(() => expect(screen.getAllByTestId('icon: Close')).toHaveLength(5));
			expect(screen.getByText('keyword1')).toBeVisible();
			expect(screen.getByText('keyword 2')).toBeVisible();
			expect(screen.getByText('keyword3')).toBeVisible();
			expect(screen.getByText('keyword4')).toBeVisible();
			expect(searchAdvancedFilters).toHaveBeenCalled();
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				keywords: [
					expect.objectContaining({ label: 'keyword1', value: 'keyword1', hasAvatar: false }),
					expect.objectContaining({ label: 'keyword 2', value: 'keyword 2', hasAvatar: false }),
					expect.objectContaining({ label: 'keyword3', value: 'keyword3', hasAvatar: false }),
					expect.objectContaining({ label: 'keyword4', value: 'keyword4', hasAvatar: false })
				]
			});
		});
	});

	describe('flagged param', () => {
		test('click on select change flagged param', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/^flagged/i)).toBeVisible();
			const searchButton = screen.getByRole('button', { name: /search/i });
			expect(searchButton).toBeVisible();
			expect(searchButton).toHaveAttribute('disabled', '');
			await user.click(screen.getByText(/^flagged/i));
			await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
			await user.click(searchButton);
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				flagged: expect.objectContaining({ value: true, label: 'Flagged', avatarIcon: 'Flag' })
			});
		});

		test('by default is set with the previous search value', async () => {
			const filters: AdvancedFilters = {
				flagged: {
					value: true,
					label: 'Flagged',
					avatarIcon: 'Flag'
				},
				// set another default filter to force a change on button
				sharedByMe: {
					value: true,
					label: 'Shared',
					avatarIcon: 'Share'
				}
			};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/^flagged/i)).toBeVisible();
			const searchButton = screen.getByRole('button', { name: /search/i });
			expect(searchButton).toBeVisible();
			expect(searchButton).toHaveAttribute('disabled', '');
			await user.click(screen.getByText(/^flagged/i));
			await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
			await user.click(searchButton);
			// flagged is not set because "select off" corresponds to "undefined"
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				sharedByMe: expect.objectContaining({ value: true, label: 'Shared', avatarIcon: 'Share' })
			});
		});
	});

	describe('shared by me param', () => {
		test('click on select change sharedByMme param', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/^shared/i)).toBeVisible();
			const searchButton = screen.getByRole('button', { name: /search/i });
			expect(searchButton).toBeVisible();
			expect(searchButton).toHaveAttribute('disabled', '');
			await user.click(screen.getByText(/^shared/i));
			await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
			await user.click(searchButton);
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				sharedByMe: expect.objectContaining({ value: true, label: 'Shared', avatarIcon: 'Share' })
			});
		});

		test('by default is set with the previous search value', async () => {
			const filters: AdvancedFilters = {
				sharedByMe: {
					value: true,
					label: 'Shared',
					avatarIcon: 'Share'
				},
				// set another default filter to force a change on button
				flagged: {
					value: true,
					label: 'Flagged',
					avatarIcon: 'Flag'
				}
			};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/^shared/i)).toBeVisible();
			const searchButton = screen.getByRole('button', { name: /search/i });
			expect(searchButton).toBeVisible();
			expect(searchButton).toHaveAttribute('disabled', '');
			await user.click(screen.getByText(/^shared/i));
			await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
			await user.click(searchButton);
			// flagged is not set because "select off" corresponds to "undefined"
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				flagged: expect.objectContaining({ value: true, label: 'Flagged', avatarIcon: 'Flag' })
			});
		});
	});

	describe('folder param', () => {
		test('input typing is disabled', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			await user.type(screen.getByRole('textbox', { name: /select a folder/i }), 'something');
			await screen.findByRole('button', { name: /go back/i });
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.queryByText(/something/i)).not.toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: /go back/i }));
			expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
			expect(screen.queryByText(/something/i)).not.toBeInTheDocument();
			expect(screen.getByText(/select a folder/i)).toBeVisible();
		});

		test('click on input without a value opens a modal with roots list', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByRole('button', { name: /choose folder/i });
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.getByText(/home/i)).toBeInTheDocument();
			expect(screen.getByText(/shared with me/i)).toBeInTheDocument();
			expect(screen.getByText(/trash/i)).toBeInTheDocument();
			expect(screen.getByText(/search also in contained folders/i)).toBeInTheDocument();
		});

		test('selection of a folder inside modal creates a chip for the selected folder', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByRole('button', { name: /choose folder/i });
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.getByText(/trash/i)).toBeVisible();
			await user.click(screen.getByText(/trash/i));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /choose folder/i })).not.toHaveAttribute(
					'disabled',
					''
				)
			);
			await user.click(screen.getByRole('button', { name: /choose folder/i }));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /search/i })).not.toHaveAttribute('disabled', '')
			);
			expect(screen.queryByRole('button', { name: /choose folder/i })).not.toBeInTheDocument();
			expect(screen.getByText(/trash/i)).toBeVisible();
			expect(screen.getByTestId('icon: Folder')).toBeVisible();
			// 2 close icon: folder chip and modal close
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(screen.getByRole('button', { name: /search/i }));
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				folderId: expect.objectContaining({
					value: ROOTS.TRASH,
					label: 'under:Trash',
					avatarIcon: 'Folder'
				}),
				cascade: { value: true }
			});
		});

		test('search in sub-folders checkbox toggle cascade param', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByRole('button', { name: /choose folder/i });
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.getByText(/trash/i)).toBeVisible();
			expect(screen.getByTestId('icon: CheckmarkSquare')).toBeVisible();
			await user.click(screen.getByText(/trash/i));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /choose folder/i })).not.toHaveAttribute(
					'disabled',
					''
				)
			);
			await user.click(screen.getByText(/search also in contained folders/i));
			await screen.findByTestId('icon: Square');
			await user.click(screen.getByRole('button', { name: /choose folder/i }));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /search/i })).not.toHaveAttribute('disabled', '')
			);
			expect(screen.queryByRole('button', { name: /choose folder/i })).not.toBeInTheDocument();
			expect(screen.getByText(/trash/i)).toBeVisible();
			expect(screen.getByTestId('icon: Folder')).toBeVisible();
			// 2 close icon: folder chip and modal close
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(screen.getByRole('button', { name: /search/i }));
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				folderId: expect.objectContaining({
					value: ROOTS.TRASH,
					label: 'in:Trash',
					avatarIcon: 'Folder'
				}),
				cascade: { value: false }
			});
		});

		test('search in sub-folders checkbox is set wit previous search value by default', async () => {
			const filters: AdvancedFilters = {
				folderId: { value: ROOTS.TRASH },
				cascade: { value: true }
			};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const trashRoot = populateFolder(0, ROOTS.TRASH, ROOTS.TRASH);
			const mocks = [mockGetPath({ node_id: ROOTS.TRASH }, [trashRoot])];
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByRole('button', { name: /choose folder/i });
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.getByText(/trash/i)).toBeVisible();
			expect(screen.getByTestId('icon: CheckmarkSquare')).toBeVisible();
			await user.click(screen.getByText(/trash/i));
			expect(screen.getByRole('button', { name: /choose folder/i })).toHaveAttribute(
				'disabled',
				''
			);
			await user.click(screen.getByRole('button', { name: /choose folder/i }));
			expect(screen.getByRole('button', { name: /choose folder/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /choose folder/i })).toHaveAttribute(
				'disabled',
				''
			);
		});

		test('set sharedWithMe param to false (exclude) if local root root is chosen', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByRole('button', { name: /choose folder/i });
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.getByText(/home/i)).toBeVisible();
			await user.click(screen.getByText(/home/i));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /choose folder/i })).not.toHaveAttribute(
					'disabled',
					''
				)
			);
			await user.click(screen.getByRole('button', { name: /choose folder/i }));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /search/i })).not.toHaveAttribute('disabled', '')
			);
			expect(screen.queryByRole('button', { name: /choose folder/i })).not.toBeInTheDocument();
			expect(screen.getByText(/home/i)).toBeVisible();
			expect(screen.getByTestId('icon: Folder')).toBeVisible();
			// 2 close icon: folder chip and modal close
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(screen.getByRole('button', { name: /search/i }));
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				folderId: expect.objectContaining({
					value: ROOTS.LOCAL_ROOT,
					label: 'under:Home',
					avatarIcon: 'Folder'
				}),
				cascade: { value: true },
				sharedWithMe: { value: false }
			});
		});

		test('set sharedWithMe param to true (include only) if shared with me if shared with me root is chosen', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByRole('button', { name: /choose folder/i });
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.getByText(/shared with me/i)).toBeVisible();
			await user.click(screen.getByText(/shared with me/i));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /choose folder/i })).not.toHaveAttribute(
					'disabled',
					''
				)
			);
			await user.click(screen.getByRole('button', { name: /choose folder/i }));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /search/i })).not.toHaveAttribute('disabled', '')
			);
			expect(screen.queryByRole('button', { name: /choose folder/i })).not.toBeInTheDocument();
			expect(screen.getByText(/shared with me/i)).toBeVisible();
			expect(screen.getByTestId('icon: Folder')).toBeVisible();
			// 2 close icon: folder chip and modal close
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(screen.getByRole('button', { name: /search/i }));
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				folderId: expect.objectContaining({
					value: undefined,
					label: 'under:Shared with me',
					avatarIcon: 'Folder'
				}),
				cascade: { value: true },
				sharedWithMe: { value: true }
			});
		});

		test('selection of a folder different from the previous search value replace the chip', async () => {
			const filters: AdvancedFilters = {
				folderId: { value: ROOTS.TRASH, label: 'Trash', avatarIcon: 'Folder' },
				cascade: { value: true }
			};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const trashRoot = populateFolder(0, ROOTS.TRASH, ROOTS.TRASH);
			const mocks = [mockGetPath({ node_id: ROOTS.TRASH }, [trashRoot])];
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks }
			);
			expect(screen.getByText(/select a folder/i)).toBeVisible();
			expect(screen.getByTestId('icon: FolderOutline')).toBeVisible();
			expect(screen.getByText(/trash/i)).toBeVisible();
			expect(screen.getByTestId('icon: Folder')).toBeVisible();
			// 2 close icon: 1 chip, 1 close modal
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(screen.getByTestId('icon: FolderOutline'));
			await screen.findByRole('button', { name: /choose folder/i });
			act(() => {
				// run modal timers
				jest.runOnlyPendingTimers();
			});
			expect(screen.getAllByText(/trash/i)).toHaveLength(2);
			expect(screen.getByText(/home/i)).toBeVisible();
			expect(screen.getByTestId('icon: CheckmarkSquare')).toBeVisible();
			await user.click(screen.getByText(/home/i));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /choose folder/i })).not.toHaveAttribute(
					'disabled',
					''
				)
			);
			await user.click(screen.getByTestId('icon: CheckmarkSquare'));
			expect(screen.getByTestId('icon: Square')).toBeVisible();
			await user.click(screen.getByRole('button', { name: /choose folder/i }));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /search/i })).not.toHaveAttribute('disabled', '')
			);
			expect(screen.queryByText(/trash/i)).not.toBeInTheDocument();
			expect(screen.getByText(/home/i)).toBeVisible();
			expect(screen.getByTestId('icon: Folder')).toBeVisible();
			// 2 close icon: 1 chip, 1 close modal
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(screen.getByRole('button', { name: /search/i }));
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				folderId: expect.objectContaining({
					value: ROOTS.LOCAL_ROOT,
					label: 'in:Home',
					avatarIcon: 'Folder'
				}),
				cascade: { value: false },
				sharedWithMe: { value: false }
			});
		});
	});

	describe('owner param', () => {
		test('search owner, select it from dropDown and call searchAdvancedFilters function with proper params', async () => {
			const contactInfo: ContactInfo = {
				_attrs: {
					email: 'test@email.com',
					zimbraId: 'zimbraId',
					fullName: 'test email',
					firstName: 'firstName',
					lastName: 'lastName',
					objectClass: []
				},
				ref: 'ref',
				id: 'id'
			};
			mockedSoapFetch.mockReturnValue({
				cn: [contactInfo]
			});

			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			// 1 close icon: close modal one
			expect(screen.getByTestId('icon: Close')).toBeVisible();
			const searchButton = screen.getByRole('button', { name: /search/i });
			expect(searchButton).toBeVisible();
			expect(searchButton).toHaveAttribute('disabled', '');
			const inputElement = screen.getByRole('textbox', { name: /owner/i });
			expect(screen.getByText(/owner/i)).toBeVisible();

			await user.type(inputElement, 'test');
			expect(inputElement).toHaveValue('test');

			const dropdownItem = await screen.findByText('test@email.com');
			expect(dropdownItem).toBeVisible();

			await user.click(dropdownItem);

			// 2 close icons: 1 chip and modal
			await waitFor(() => expect(screen.getAllByTestId('icon: Close')).toHaveLength(2));
			// search button becomes enabled
			await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));
			expect(screen.getByText('firstName lastName')).toBeVisible();

			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(searchButton);
			expect(searchAdvancedFilters).toHaveBeenCalled();
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				ownerId: expect.objectContaining({
					avatarBackground: 'secondary',
					label: 'firstName  lastName',
					value: 'zimbraId'
				})
			});
		});
	});

	describe('item type param', () => {
		test('open dropdown, select an item from dropDown and call searchAdvancedFilters function with proper params', async () => {
			const filters = {};
			const closeAction = jest.fn();
			const searchAdvancedFilters = jest.fn();
			const { user } = setup(
				<AdvancedSearchModalContent
					filters={filters}
					closeAction={closeAction}
					searchAdvancedFilters={searchAdvancedFilters}
				/>,
				{ mocks: [] }
			);
			// 1 close icon: close modal one
			expect(screen.getByTestId('icon: Close')).toBeVisible();
			const searchButton = screen.getByRole('button', { name: /search/i });
			expect(searchButton).toBeVisible();
			expect(searchButton).toHaveAttribute('disabled', '');
			const inputElement = screen.getByRole('textbox', { name: /item type/i });
			expect(screen.getByText(/item type/i)).toBeVisible();

			// open dropdown clicking on input
			await user.click(inputElement);

			const dropdownList = await screen.findByTestId(SELECTORS.dropdownList);

			const folderDropdownItemLabel = await within(dropdownList).findByText('Folder');
			expect(folderDropdownItemLabel).toBeVisible();
			expect(await within(dropdownList).findByTestId('icon: FolderOutline')).toBeVisible();

			expect(await within(dropdownList).findByText('Document')).toBeVisible();
			expect(await within(dropdownList).findByTestId('icon: FileTextOutline')).toBeVisible();

			expect(await within(dropdownList).findByText('Spreadsheet')).toBeVisible();
			expect(await within(dropdownList).findByTestId('icon: FileCalcOutline')).toBeVisible();

			expect(await within(dropdownList).findByText('Presentation')).toBeVisible();
			expect(
				await within(dropdownList).findByTestId('icon: FilePresentationOutline')
			).toBeVisible();

			expect(await within(dropdownList).findByText('Image')).toBeVisible();
			expect(await within(dropdownList).findByTestId('icon: ImageOutline')).toBeVisible();

			expect(await within(dropdownList).findByText('Video')).toBeVisible();
			expect(await within(dropdownList).findByTestId('icon: VideoOutline')).toBeVisible();

			expect(await within(dropdownList).findByText('Audio')).toBeVisible();
			expect(await within(dropdownList).findByTestId('icon: MusicOutline')).toBeVisible();

			await user.click(folderDropdownItemLabel);

			// 2 close icons: 1 chip and modal
			await waitFor(() => expect(screen.getAllByTestId('icon: Close')).toHaveLength(2));
			// search button becomes enabled
			await waitFor(() => expect(searchButton).not.toHaveAttribute('disabled', ''));

			expect(screen.getByText('Folder')).toBeVisible();
			expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
			await user.click(searchButton);

			expect(searchAdvancedFilters).toHaveBeenCalled();
			expect(searchAdvancedFilters).toHaveBeenCalledWith({
				type: expect.objectContaining({
					avatarBackground: 'secondary',
					label: 'Folder',
					value: NodeType.Folder,
					avatarIcon: 'Folder'
				})
			});
		});
	});
});
