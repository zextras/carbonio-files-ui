/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { List } from './List';
import { SelectionProvider } from './SelectionProvider';
import { PREVIEW_PATH, PREVIEW_TYPE, REST_ENDPOINT } from '../../constants';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import * as useOpenWithDocs from '../../hooks/useOpenWithDocs';
import { populateFile, populateImgFile, populateNodes } from '../../mocks/mockUtils';
import { selectNodes, setup, screen } from '../../tests/utils';
import { NodeType } from '../../types/graphql/types';
import * as previewUtils from '../../utils/previewUtils';

vi.mock('./VirtualizedNodeListItem');

describe('List', () => {
	describe('Badge', () => {
		test('should render the list header with the badge with the number of selected items', async () => {
			const nodes = populateNodes(10);
			const { user } = setup(
				<SelectionProvider items={nodes}>
					<List nodes={nodes} mainList emptyListMessage={'hint'} />
				</SelectionProvider>
			);
			const nodesSelected = [nodes[0].id, nodes[1].id];
			// the user selected the first 2 nodes
			await selectNodes(nodesSelected, user);
			expect(screen.getByText(2)).toBeVisible();
			// the user selects 2 more nodes
			await selectNodes([nodes[2].id, nodes[3].id], user);
			expect(screen.getByText(4)).toBeVisible();
		});
		test('if the user clicks SELECT ALL, the badge renders with the length of all nodes, and vice versa', async () => {
			const nodes = populateNodes(10);
			const { user } = setup(
				<SelectionProvider items={nodes}>
					<List nodes={nodes} mainList emptyListMessage={'hint'} />
				</SelectionProvider>
			);
			// the user selects 1 node
			await selectNodes([nodes[0].id], user);
			expect(screen.getByText(/SELECT ALL/i)).toBeVisible();
			await user.click(screen.getByText(/SELECT ALL/i));
			expect(screen.getByText(nodes.length)).toBeVisible();
			await user.click(screen.getByText(/DESELECT ALL/i));
			expect(screen.queryByText(nodes.length)).not.toBeInTheDocument();
		});
	});

	describe('Preview', () => {
		test.skip.each([
			['image/jpeg', 'jpeg'],
			['image/png', 'png'],
			['image/gif', 'gif'],
			['image/svg+xml', 'png']
		])(
			'Double click on node of type image with mime type %s open preview to show image with original dimensions and format %s',
			async (mimeType, outputFormat) => {
				const node = populateFile();
				node.type = NodeType.Image;
				node.extension = 'ext';
				node.mime_type = mimeType;

				const { user } = setup(
					<SelectionProvider items={[node]}>
						<List nodes={[node]} mainList emptyListMessage={'Empty list'} />
					</SelectionProvider>
				);
				await user.dblClick(screen.getByText(node.name));
				await screen.findByRole('img');
				expect(screen.getByRole('img')).toBeVisible();
				expect(screen.getByRole('img')).toHaveAttribute(
					'src',
					`${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.IMAGE}/${node.id}/0x0?quality=high&output_format=${outputFormat}`
				);
			}
		);

		test.skip('Double click on node of type pdf open preview without action to open in docs', async () => {
			const node = populateFile();
			node.mime_type = 'application/pdf';
			node.type = NodeType.Application;
			node.extension = 'pdf';
			node.size = 5000;

			const { user } = setup(
				<SelectionProvider items={[node]}>
					<List nodes={[node]} mainList emptyListMessage={'Empty list'} />
				</SelectionProvider>
			);
			await user.dblClick(screen.getByText(node.name));
			await screen.findByTestId(SELECTORS.pdfPreview);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.previewClose })).toBeVisible();
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.share })).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.previewDownload })
			).toBeVisible();
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.openDocument })
			).not.toBeInTheDocument();
		});

		test('Double click on node that is supported by both preview and docs and has write permissions open document with docs', async () => {
			const openWithDocsFn = vi.fn();
			vi.spyOn(useOpenWithDocs, 'useOpenWithDocs').mockReturnValue(openWithDocsFn);
			const node = populateFile();
			node.permissions.can_write_file = true;
			node.mime_type = 'application/vnd.oasis.opendocument.text';
			node.type = NodeType.Text;
			node.extension = 'odt';

			const { user } = setup(
				<SelectionProvider items={[node]}>
					<List nodes={[node]} mainList emptyListMessage={'Empty list'} />
				</SelectionProvider>
			);
			await user.dblClick(screen.getByText(node.name));
			expect(openWithDocsFn).toHaveBeenCalled();
			expect(screen.queryByTestId(SELECTORS.pdfPreview)).not.toBeInTheDocument();
		});

		test.skip('Double click on node that is supported by both preview and docs but does not have write permissions open document with preview', async () => {
			const openWithDocsFn = vi.fn();
			vi.spyOn(useOpenWithDocs, 'useOpenWithDocs').mockReturnValue(openWithDocsFn);
			const node = populateFile();
			node.permissions.can_write_file = false;
			node.mime_type = 'application/vnd.oasis.opendocument.text';
			node.type = NodeType.Text;
			node.extension = 'odt';
			node.size = 5000;

			const { user } = setup(
				<SelectionProvider items={[node]}>
					<List nodes={[node]} mainList emptyListMessage={'Empty list'} />
				</SelectionProvider>
			);
			await user.dblClick(screen.getByText(node.name));
			await screen.findByTestId(SELECTORS.pdfPreview);
			expect(openWithDocsFn).not.toHaveBeenCalled();
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.previewClose })).toBeVisible();
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.share })).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.previewDownload })
			).toBeVisible();
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.openDocument })).toBeVisible();
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.edit })
			).not.toBeInTheDocument();
		});

		test('Double click on node that is not supported by preview nor docs does nothing', async () => {
			const openWithDocsFn = vi.fn();
			vi.spyOn(useOpenWithDocs, 'useOpenWithDocs').mockReturnValue(openWithDocsFn);
			const getDocumentPreviewSrcFn = vi.spyOn(previewUtils, 'getDocumentPreviewSrc');
			const getPdfPreviewSrcFn = vi.spyOn(previewUtils, 'getPdfPreviewSrc');
			const getImgPreviewSrcFn = vi.spyOn(previewUtils, 'getImgPreviewSrc');
			const node = populateFile();
			node.type = NodeType.Application;
			node.mime_type = 'unsupported/mimetype';

			const { user } = setup(
				<SelectionProvider items={[node]}>
					<List nodes={[node]} mainList emptyListMessage={'Empty list'} />
				</SelectionProvider>
			);
			await user.dblClick(screen.getByText(node.name));
			expect(getDocumentPreviewSrcFn).not.toHaveBeenCalled();
			expect(getPdfPreviewSrcFn).not.toHaveBeenCalled();
			expect(getImgPreviewSrcFn).not.toHaveBeenCalled();
			expect(openWithDocsFn).not.toHaveBeenCalled();
		});

		describe('Preview load more without exit from preview', () => {
			test.skip('should call loadMore when reaching the second-last preview item', async () => {
				const nodes = Array.from({ length: 10 }, () => populateImgFile());
				const loadMore = vi.fn();

				const { user } = setup(
					<SelectionProvider items={nodes}>
						<List
							nodes={nodes}
							mainList
							emptyListMessage={'No items'}
							loadMore={loadMore}
							hasMore
						/>
					</SelectionProvider>
				);

				await user.dblClick(screen.getByText(nodes[0].name));
				const navigationPromises = Array.from({ length: 7 }, () => user.keyboard('{ArrowRight}'));
				await Promise.all(navigationPromises);

				expect(loadMore).not.toHaveBeenCalled();

				await user.keyboard('{ArrowRight}');
				expect(loadMore).toHaveBeenCalled();
			});

			test('should not call loadMore if hasMore is false', async () => {
				const nodes = Array.from({ length: 10 }, () => populateImgFile());
				const loadMore = vi.fn();

				const { user } = setup(
					<SelectionProvider items={nodes}>
						<List
							nodes={nodes}
							mainList
							emptyListMessage={'No items'}
							loadMore={loadMore}
							hasMore={false}
						/>
					</SelectionProvider>
				);

				await user.dblClick(screen.getByText(nodes[0].name));
				const navigationPromises = nodes.map(() => user.keyboard('{ArrowRight}'));
				await Promise.all(navigationPromises);

				expect(loadMore).not.toHaveBeenCalled();
			});
		});
	});
});
