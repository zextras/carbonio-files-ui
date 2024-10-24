/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { forEach, map } from 'lodash';
import { http, HttpResponse } from 'msw';
import { DefaultTheme } from 'styled-components';
import 'jest-styled-components';

import { NodeDetails } from './NodeDetails';
import server from '../../../mocks/server';
import {
	HEALTH_PATH,
	DATE_TIME_FORMAT,
	NODES_LOAD_LIMIT,
	PREVIEW_PATH,
	PREVIEW_SERVICE_NAME,
	PREVIEW_TYPE,
	REST_ENDPOINT
} from '../../constants';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import { healthCache } from '../../hooks/useHealthInfo';
import { HealthResponse } from '../../mocks/handleHealthRequest';
import {
	populateFile,
	populateFolder,
	populateNode,
	populateNodes,
	populateParents,
	populateShare,
	populateShares,
	populateUser
} from '../../mocks/mockUtils';
import { buildBreadCrumbRegExp, setup, triggerLoadMore } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { Folder, NodeType, QueryGetPathArgs } from '../../types/graphql/types';
import { canUpsertDescription } from '../../utils/ActionsFactory';
import * as previewUtils from '../../utils/previewUtils';
import { mockGetPath } from '../../utils/resolverMocks';
import { formatDate, humanFileSize } from '../../utils/utils';

describe('Node Details', () => {
	test('Show file info', () => {
		const node = populateFile();
		node.parent = populateFolder();
		node.last_editor = populateUser();
		const loadMore = jest.fn();
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				size={node.size}
				type={node.type}
				nodes={undefined}
				rootId={null}
				version={undefined}
				mimeType={undefined}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText(node.owner.full_name)).toBeVisible();
		expect(
			screen.getByText(formatDate(node.created_at, undefined, DATE_TIME_FORMAT))
		).toBeVisible();
		expect(screen.getByText(node.last_editor.full_name)).toBeVisible();
		expect(screen.getByText(node.last_editor.email)).toBeVisible();
		expect(
			screen.getByText(formatDate(node.created_at, undefined, DATE_TIME_FORMAT))
		).toBeVisible();
		expect(screen.getByText(node.description)).toBeVisible();
		expect(screen.getByText(humanFileSize(node.size, undefined))).toBeVisible();
	});

	test('Show folder info', () => {
		const node = populateFolder();
		node.parent = populateFolder();
		node.last_editor = populateUser();
		node.shares = populateShares(node, 5);
		node.owner = populateUser();
		const children = populateNodes(2);
		forEach(children, (child) => {
			child.owner = node.owner;
		});
		const loadMore = jest.fn();
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				nodes={children}
				type={node.type}
				size={undefined}
				rootId={null}
				version={undefined}
				mimeType={undefined}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText('Collaborators')).toBeVisible();
		expect(screen.getAllByText(node.owner.full_name)).toHaveLength(children.length + 1);
		expect(
			screen.getByText(formatDate(node.created_at, undefined, DATE_TIME_FORMAT))
		).toBeVisible();
		expect(screen.getByText(node.last_editor.full_name)).toBeVisible();
		expect(screen.getByText(node.last_editor.email)).toBeVisible();
		expect(
			screen.getByText(formatDate(node.created_at, undefined, DATE_TIME_FORMAT))
		).toBeVisible();
		expect(screen.getByText(node.description)).toBeVisible();
		expect(screen.queryByText('Size')).not.toBeInTheDocument();
		expect(screen.queryByText('Downloads')).not.toBeInTheDocument();
		expect(screen.getByText('Content')).toBeVisible();
		expect(screen.getByText(children[0].name)).toBeVisible();
		expect(screen.getByText(children[1].name)).toBeVisible();
	});

	test('Labels of empty info are hidden', () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const loadMore = jest.fn();
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={null}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description=""
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={[]}
				hasMore={false}
				size={undefined}
				type={node.type}
				nodes={undefined}
				rootId={null}
				version={undefined}
				mimeType={undefined}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText(node.owner.full_name)).toBeVisible();
		expect(
			screen.getByText(formatDate(node.created_at, undefined, DATE_TIME_FORMAT))
		).toBeVisible();
		expect(screen.queryByText('Last edit')).not.toBeInTheDocument();
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText('Click the edit button to add a description')).toBeInTheDocument();
		expect(screen.queryByText('Size')).not.toBeInTheDocument();
		expect(screen.queryByText('Downloads')).not.toBeInTheDocument();
		expect(screen.queryByText('Collaborators')).not.toBeInTheDocument();
	});

	test('Show path button load the full path of the node. If path is reset in cache, full path is updated in the view', async () => {
		const { node, path } = populateParents(populateNode(), 3);
		const { node: newParent, path: newPath } = populateParents(populateFolder(), 4);

		const path2 = [...newPath, { ...node, parent: newParent }];

		const mocks = {
			Query: {
				getPath: mockGetPath(path, path2)
			}
		} satisfies Partial<Resolvers>;

		const loadMore = jest.fn();
		const { getByTextWithMarkup, queryByTextWithMarkup, findByTextWithMarkup, user } = setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={[]}
				hasMore={false}
				size={0}
				type={node.type}
				nodes={undefined}
				rootId={null}
				version={undefined}
				mimeType={undefined}
			/>,
			{ mocks }
		);

		await screen.findByText(node.name, { exact: false });
		expect(getByTextWithMarkup(buildBreadCrumbRegExp(node.name))).toBeVisible();
		expect(
			screen.queryByText((node.parent as Folder).name, { exact: false })
		).not.toBeInTheDocument();
		const showPathButton = screen.getByRole('button', { name: /show path/i });
		expect(showPathButton).toBeVisible();
		await user.click(showPathButton);
		await screen.findByText((node.parent as Folder).name, { exact: false });
		expect(
			getByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
		).toBeVisible();
		expect(showPathButton).not.toBeInTheDocument();
		const getPathArgs: QueryGetPathArgs = { node_id: node.id };
		global.apolloClient.cache.evict({
			fieldName: 'getPath',
			args: getPathArgs
		});
		const newBreadcrumb = buildBreadCrumbRegExp(...map(path2, (parent) => parent.name));
		await findByTextWithMarkup(newBreadcrumb);
		expect(getByTextWithMarkup(newBreadcrumb)).toBeVisible();
		expect(
			queryByTextWithMarkup(buildBreadCrumbRegExp(...map(path, (parent) => parent.name)))
		).not.toBeInTheDocument();
		expect(showPathButton).not.toBeInTheDocument();
	});

	test('Collaborators are rendered with email capitals if full_name is empty', () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		const collaborator = populateUser();
		collaborator.full_name = '';
		const share = populateShare(node, 'share-1', collaborator);
		const loadMore = jest.fn();
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.owner}
				lastEditor={null}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description=""
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={[share]}
				hasMore={false}
				size={undefined}
				type={node.type}
				nodes={undefined}
				rootId={null}
				version={undefined}
				mimeType={undefined}
			/>,
			{ mocks: {} }
		);

		expect(screen.getByText(/collaborators/i)).toBeVisible();
		// capitals should be first and last letter of the email
		expect(
			screen.getByText(
				`${collaborator.email[0]}${collaborator.email[collaborator.email.length - 1]}`.toUpperCase()
			)
		).toBeVisible();
	});

	test('If owner or creator or last editor have not full name, only email is shown in corresponding row', () => {
		const node = populateFile();
		node.permissions.can_write_file = true;
		node.owner = { ...node.owner, full_name: '' };
		node.last_editor = { ...populateUser(), full_name: '' };
		node.creator = { ...node.creator, full_name: '' };
		const loadMore = jest.fn();
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description=""
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={[]}
				hasMore={false}
				size={undefined}
				type={node.type}
				nodes={undefined}
				rootId={null}
				version={undefined}
				mimeType={undefined}
			/>,
			{ mocks: {} }
		);

		expect(screen.getByText(/owner/i)).toBeVisible();
		expect(screen.getByText(node.owner.email)).toBeVisible();
		expect(screen.getByText(/last edit/i)).toBeVisible();
		expect(screen.getByText(node.last_editor.email)).toBeVisible();
		expect(screen.getByText(/created by/i)).toBeVisible();
		expect(screen.getByText(node.creator.email)).toBeVisible();
		expect(screen.queryByText('|')).not.toBeInTheDocument();
	});

	test('should show file preview for image when preview is live', async () => {
		const getPreviewThumbnailSrcFn = jest.spyOn(previewUtils, 'getPreviewThumbnailSrc');
		healthCache.reset();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: PREVIEW_SERVICE_NAME, live: true }] })
			)
		);
		const node = populateFile();
		const loadMore = jest.fn();
		node.type = NodeType.Image;
		node.mime_type = 'image/png';
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				size={node.size}
				type={node.type}
				version={node.version}
				mimeType={node.mime_type}
				nodes={undefined}
				rootId={null}
			/>,
			{ mocks: {} }
		);
		await screen.findByTestId('node-details');
		await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
		expect(await screen.findByRole('presentation')).toBeVisible();
		expect(getPreviewThumbnailSrcFn).toHaveBeenCalled();
	});

	test('should not show file preview for image when preview is not live', async () => {
		const getPreviewThumbnailSrcFn = jest.spyOn(previewUtils, 'getPreviewThumbnailSrc');
		healthCache.reset();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: PREVIEW_SERVICE_NAME, live: false }] })
			)
		);
		const node = populateFile();
		const loadMore = jest.fn();
		node.type = NodeType.Image;
		node.mime_type = 'image/png';
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				size={node.size}
				type={node.type}
				version={node.version}
				mimeType={node.mime_type}
				nodes={undefined}
				rootId={null}
			/>,
			{ mocks: {} }
		);
		await screen.findByTestId('node-details');
		await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
		expect(getPreviewThumbnailSrcFn).not.toHaveBeenCalled();
		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
	});

	test('should show preview of gif image with gif format', async () => {
		const node = populateFile();
		const loadMore = jest.fn();
		node.type = NodeType.Image;
		node.mime_type = 'image/gif';
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				size={node.size}
				type={node.type}
				version={node.version}
				mimeType={node.mime_type}
				nodes={undefined}
				rootId={null}
			/>,
			{ mocks: {} }
		);
		expect(await screen.findByRole('presentation')).toBeVisible();
		expect(screen.getByRole('presentation')).toHaveAttribute(
			'src',
			`${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.IMAGE}/${node.id}/${node.version}/0x256/thumbnail/?shape=rectangular&quality=high&output_format=gif`
		);
	});

	it('should show file preview for pdf', async () => {
		const node = populateFile();
		const loadMore = jest.fn();
		node.type = NodeType.Text;
		node.mime_type = 'application/pdf';
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				size={node.size}
				type={node.type}
				version={node.version}
				mimeType={node.mime_type}
				nodes={undefined}
				rootId={null}
			/>,
			{ mocks: {} }
		);
		await screen.findByRole('presentation');
		expect(screen.getByRole('presentation')).toBeVisible();
		expect(screen.getByRole('presentation')).toHaveAttribute(
			'src',
			`${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.PDF}/${node.id}/${node.version}/0x256/thumbnail/?shape=rectangular&quality=high&output_format=jpeg`
		);
	});

	test('should not show file thumbnail for document', async () => {
		const node = populateFile();
		const loadMore = jest.fn();
		node.type = NodeType.Application;
		node.mime_type = 'application/vnd.oasis.opendocument.text';
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				size={node.size}
				type={node.type}
				version={node.version}
				mimeType={node.mime_type}
				nodes={undefined}
				rootId={null}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText(node.name)).toBeVisible();
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
	});

	test('Do not show file preview for node with unsupported type/mime type', async () => {
		const node = populateFile();
		const loadMore = jest.fn();
		node.type = NodeType.Text;
		node.mime_type = 'text/plain';
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore={false}
				size={node.size}
				type={node.type}
				version={node.version}
				mimeType={node.mime_type}
				nodes={undefined}
				rootId={null}
			/>,
			{ mocks: {} }
		);
		expect(screen.getByText(node.name)).toBeVisible();
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
	});

	test('intersectionObserver trigger the fetchMore function to load more elements when observed element is intersected', async () => {
		const node = populateFolder();
		node.parent = populateFolder();
		node.last_editor = populateUser();
		node.shares = populateShares(node, 5);
		node.owner = populateUser();
		const nodes = populateNodes(NODES_LOAD_LIMIT);
		forEach(nodes, (child) => {
			child.owner = node.owner;
		});
		const loadMore = jest.fn();
		setup(
			<NodeDetails
				typeName={node.__typename}
				id={node.id}
				name={node.name}
				owner={node.owner}
				creator={node.creator}
				lastEditor={node.last_editor}
				createdAt={node.created_at}
				updatedAt={node.updated_at}
				description={node.description}
				canUpsertDescription={canUpsertDescription({ nodes: [node] })}
				loadMore={loadMore}
				loading={false}
				shares={node.shares}
				hasMore
				nodes={nodes}
				type={node.type}
				size={undefined}
				rootId={null}
				version={undefined}
				mimeType={undefined}
			/>,
			{ mocks: {} }
		);

		// wait the rendering of the first item
		const firstElement = await screen.findByText(nodes[0].name);
		expect(firstElement).toBeVisible();
		// the loading icon should be still visible at the bottom of the list because we have load the max limit of items per page
		expect(screen.getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();

		// elements after the limit should not be rendered
		expect(screen.queryAllByTestId(SELECTORS.detailsNodeItem(), { exact: false })).toHaveLength(
			nodes.length
		);

		await triggerLoadMore();

		expect(loadMore).toHaveBeenCalled();
	});
	test.each<[type: NodeType, mimeType: string, icon: keyof DefaultTheme['icons'], color: string]>([
		[NodeType.Folder, 'any', 'Folder', '#828282'],
		[NodeType.Text, 'application/pdf', 'FilePdf', '#d74942'],
		[NodeType.Text, 'any', 'FileText', '#2b73d2'],
		[NodeType.Video, 'any', 'Video', '#d74942'],
		[NodeType.Audio, 'any', 'Music', '#414141'],
		[NodeType.Image, 'any', 'Image', '#d74942'],
		[NodeType.Message, 'any', 'Email', '#2b73d2'],
		[NodeType.Presentation, 'any', 'FilePresentation', '#FFA726'],
		[NodeType.Spreadsheet, 'any', 'FileCalc', '#8bc34a'],
		[NodeType.Application, 'any', 'Code', '#414141'],
		[NodeType.Other, 'any', 'File', '#2b73d2']
	])(
		'child of a folder with type %s and mimetype %s show icon %s with color %s inside content',
		(type, mimeType, icon, color) => {
			const node = populateFolder();
			const loadMore = jest.fn();
			const child = populateFile();
			child.type = type;
			child.mime_type = mimeType;
			setup(
				<NodeDetails
					typeName={node.__typename}
					id={node.id}
					name={node.name}
					owner={node.owner}
					creator={node.creator}
					lastEditor={node.last_editor}
					createdAt={node.created_at}
					updatedAt={node.updated_at}
					description={node.description}
					canUpsertDescription={canUpsertDescription({ nodes: [node] })}
					loadMore={loadMore}
					loading={false}
					shares={node.shares}
					hasMore
					nodes={[child]}
					type={node.type}
					size={undefined}
					rootId={null}
					version={undefined}
					mimeType={undefined}
				/>
			);
			expect(screen.getByTestId(`icon: ${icon}`)).toBeVisible();
			expect(screen.getByTestId(`icon: ${icon}`)).toHaveStyleRule('color', color);
		}
	);
});
