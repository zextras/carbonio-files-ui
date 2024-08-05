/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { waitFor } from '@testing-library/react';
import { map, find } from 'lodash';
import { graphql, http, HttpResponse } from 'msw';

import { Versioning } from './Versioning';
import server from '../../../../mocks/server';
import { CONFIGS, ERROR_CODE, REST_ENDPOINT, UPLOAD_VERSION_PATH } from '../../../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../../constants/test';
import {
	UploadRequestBody,
	UploadVersionRequestParams,
	UploadVersionResponse
} from '../../../mocks/handleUploadVersionRequest';
import {
	getVersionFromFile,
	incrementVersion,
	populateConfigs,
	populateFile
} from '../../../mocks/mockUtils';
import { generateError, setup, screen, within } from '../../../tests/utils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import {
	File as FilesFile,
	GetVersionsDocument,
	GetVersionsQuery,
	GetVersionsQueryVariables,
	NodeType
} from '../../../types/graphql/types';
import {
	mockCloneVersion,
	mockDeleteVersions,
	mockErrorResolver,
	mockGetConfigs,
	mockGetVersions,
	mockKeepVersions
} from '../../../utils/resolverMocks';
import * as moduleUtils from '../../../utils/utils';
import { getChipLabel } from '../../../utils/utils';

describe('Versioning', () => {
	test('versions list split', async () => {
		const fileVersion1 = populateFile();
		fileVersion1.permissions.can_write_file = true;

		const fileVersion2 = incrementVersion(fileVersion1, true);
		const fileVersion3 = incrementVersion(fileVersion2, true);

		const dayOffset = 24 * 60 * 60 * 1000;

		fileVersion3.updated_at = Date.now();
		fileVersion2.updated_at = fileVersion3.updated_at - dayOffset;
		fileVersion1.updated_at = fileVersion2.updated_at - 10 * dayOffset;

		const version1 = getVersionFromFile(fileVersion1);
		const version2 = getVersionFromFile(fileVersion2);
		const version3 = getVersionFromFile(fileVersion3);

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions([version3, version2, version1] as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		setup(<Versioning node={fileVersion3} />, { mocks });

		await screen.findByText(getChipLabel(fileVersion3.last_editor));

		const version3LastEditor = screen.getByText(getChipLabel(version3.last_editor));
		expect(version3LastEditor).toBeVisible();
		const version2LastEditor = screen.getByText(getChipLabel(version2.last_editor));
		expect(version2LastEditor).toBeVisible();
		const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
		expect(version1LastEditor).toBeVisible();

		expect(screen.getByText('Current version')).toBeVisible();
		expect(screen.getByText('Last week')).toBeVisible();
		expect(screen.getByText('Older versions')).toBeVisible();
	});

	describe('test delete version', () => {
		test('delete version', async () => {
			const fileVersion1 = populateFile();
			fileVersion1.permissions.can_write_file = true;
			const fileVersion2 = incrementVersion(fileVersion1, true);
			const fileVersion3 = incrementVersion(fileVersion2, true);
			const fileVersion4 = incrementVersion(fileVersion3, true);
			const fileVersion5 = incrementVersion(fileVersion4, true);

			const dayOffset = 24 * 60 * 60 * 1000;
			fileVersion5.updated_at = Date.now();
			fileVersion4.updated_at = fileVersion5.updated_at - dayOffset;
			fileVersion3.updated_at = fileVersion4.updated_at - dayOffset;
			fileVersion2.updated_at = fileVersion3.updated_at - dayOffset;
			fileVersion1.updated_at = fileVersion2.updated_at - dayOffset;

			// must be false to be deletable
			fileVersion2.keep_forever = false;

			const version1 = getVersionFromFile(fileVersion1);
			const version2 = getVersionFromFile(fileVersion2);
			const version3 = getVersionFromFile(fileVersion3);
			const version4 = getVersionFromFile(fileVersion4);
			const version5 = getVersionFromFile(fileVersion5);

			const mocks = {
				Query: {
					getConfigs: mockGetConfigs(),
					getVersions: mockGetVersions([
						version5,
						version4,
						version3,
						version2,
						version1
					] as FilesFile[])
				},
				Mutation: {
					deleteVersions: mockDeleteVersions([version2.version])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<Versioning node={fileVersion5} />, { mocks });
			await screen.findByText(getChipLabel(fileVersion5.last_editor));

			const version5LastEditor = screen.getByText(getChipLabel(version5.last_editor));
			expect(version5LastEditor).toBeVisible();
			const version4LastEditor = screen.getByText(getChipLabel(version4.last_editor));
			expect(version4LastEditor).toBeVisible();
			const version3LastEditor = screen.getByText(getChipLabel(version3.last_editor));
			expect(version3LastEditor).toBeVisible();
			const version2LastEditor = screen.getByText(getChipLabel(version2.last_editor));
			expect(version2LastEditor).toBeVisible();
			const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
			expect(version1LastEditor).toBeVisible();

			expect(screen.getByText('Current version')).toBeVisible();
			expect(screen.getByText('Last week')).toBeVisible();

			const versionIcons = screen.getByTestId(SELECTORS.versionIcons(2));
			const versionMoreButton = within(versionIcons).getByTestId(ICON_REGEXP.moreVertical);
			await user.click(versionMoreButton);

			const deleteVersionItem = await screen.findByText(/delete version/i);
			await user.click(deleteVersionItem);
			await waitFor(() => expect(screen.getAllByText(/Version \d/)).toHaveLength(4));
			expect(version2LastEditor).not.toBeInTheDocument();
		});

		test('purge all versions', async () => {
			const fileVersion1 = populateFile();
			fileVersion1.permissions.can_write_file = true;
			const fileVersion2 = incrementVersion(fileVersion1, true);
			const fileVersion3 = incrementVersion(fileVersion2, true);
			const fileVersion4 = incrementVersion(fileVersion3, true);
			const fileVersion5 = incrementVersion(fileVersion4, true);

			const dayOffset = 24 * 60 * 60 * 1000;
			fileVersion5.updated_at = Date.now();
			fileVersion4.updated_at = fileVersion5.updated_at - dayOffset;
			fileVersion3.updated_at = fileVersion4.updated_at - dayOffset;
			fileVersion2.updated_at = fileVersion3.updated_at - dayOffset;
			fileVersion1.updated_at = fileVersion2.updated_at - dayOffset;

			fileVersion5.keep_forever = false;
			fileVersion4.keep_forever = false;
			fileVersion3.keep_forever = false;
			fileVersion2.keep_forever = true;
			fileVersion1.keep_forever = false;

			const version1 = getVersionFromFile(fileVersion1);
			const version2 = getVersionFromFile(fileVersion2);
			const version3 = getVersionFromFile(fileVersion3);
			const version4 = getVersionFromFile(fileVersion4);
			const version5 = getVersionFromFile(fileVersion5);

			const mocks = {
				Query: {
					getConfigs: mockGetConfigs(),
					getVersions: mockGetVersions([
						version5,
						version4,
						version3,
						version2,
						version1
					] as FilesFile[])
				},
				Mutation: {
					deleteVersions: mockDeleteVersions([version4.version, version3.version, version1.version])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<Versioning node={fileVersion5} />, { mocks });
			await screen.findByText(getChipLabel(fileVersion5.last_editor));

			const version5LastEditor = screen.getByText(getChipLabel(version5.last_editor));
			expect(version5LastEditor).toBeVisible();
			const version4LastEditor = screen.getByText(getChipLabel(version4.last_editor));
			expect(version4LastEditor).toBeVisible();
			const version3LastEditor = screen.getByText(getChipLabel(version3.last_editor));
			expect(version3LastEditor).toBeVisible();
			const version2LastEditor = screen.getByText(getChipLabel(version2.last_editor));
			expect(version2LastEditor).toBeVisible();
			const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
			expect(version1LastEditor).toBeVisible();

			expect(screen.getByText('Current version')).toBeVisible();
			expect(screen.getByText('Last week')).toBeVisible();

			const purgeButton = await screen.findByRole('button', { name: /purge all versions/i });
			await user.click(purgeButton);

			await screen.findByText(
				/All versions that are not marked to be kept forever, except the current one, will be deleted/i
			);

			expect(screen.getAllByRole('button', { name: /purge all versions/i })).toHaveLength(2);
			const modalPurgeAllButton = within(screen.getByTestId(SELECTORS.modal)).getByRole('button', {
				name: /purge all versions/i
			});

			expect(modalPurgeAllButton).toBeInTheDocument();
			await user.click(modalPurgeAllButton);
			expect(screen.queryByTestId(SELECTORS.modal)).not.toBeInTheDocument();
			await waitFor(() => expect(screen.getAllByText(/Version \d/)).toHaveLength(2));
			expect(version3LastEditor).not.toBeInTheDocument();
		});
	});

	test('keep version', async () => {
		const fileVersion1 = populateFile();
		fileVersion1.permissions.can_write_file = true;
		const fileVersion2 = incrementVersion(fileVersion1, true);

		const dayOffset = 24 * 60 * 60 * 1000;
		fileVersion2.updated_at = Date.now();
		fileVersion1.updated_at = fileVersion2.updated_at - dayOffset;

		fileVersion2.keep_forever = false;

		const version1 = getVersionFromFile(fileVersion1);
		const version2 = getVersionFromFile(fileVersion2);

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions([version2, version1] as FilesFile[])
			},
			Mutation: {
				keepVersions: mockKeepVersions([version2.version], [version2.version])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={fileVersion2} />, { mocks });
		await screen.findByText(getChipLabel(fileVersion2.last_editor));

		const version2LastEditor = screen.getByText(getChipLabel(version2.last_editor));
		expect(version2LastEditor).toBeVisible();
		const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
		expect(version1LastEditor).toBeVisible();

		expect(screen.getByText('Current version')).toBeVisible();
		expect(screen.getByText('Last week')).toBeVisible();

		const versionIcons = screen.getByTestId(SELECTORS.versionIcons(2));
		const versionMoreButton = within(versionIcons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versionMoreButton);

		const keepForeverVersionItem = await screen.findByText(/keep this version forever/i);
		await user.click(keepForeverVersionItem);

		await screen.findByText(/Version marked as to be kept forever/i);

		await within(versionIcons).findByTestId(ICON_REGEXP.versionKeepForever);
		const keepIcon = within(versionIcons).getByTestId(ICON_REGEXP.versionKeepForever);
		expect(keepIcon).toBeVisible();

		await user.click(versionMoreButton);
		const removeKeepForeverItem = await screen.findByText(/remove keep forever/i);
		await user.click(removeKeepForeverItem);

		await screen.findByText(/Keep forever removed/i);

		expect(keepIcon).not.toBeInTheDocument();
	});

	test('clone version', async () => {
		const fileVersion1 = populateFile();
		fileVersion1.permissions.can_write_file = true;
		const fileVersion2 = incrementVersion(fileVersion1, true);

		const fileVersion3 = incrementVersion(fileVersion2, true);

		const dayOffset = 24 * 60 * 60 * 1000;
		const hourOffset = 60 * 60 * 1000;
		fileVersion3.updated_at = Date.now();
		fileVersion2.updated_at = fileVersion3.updated_at - hourOffset;
		fileVersion1.updated_at = fileVersion2.updated_at - dayOffset;

		const version1 = getVersionFromFile(fileVersion1);
		const version2 = getVersionFromFile(fileVersion2);
		const version3 = getVersionFromFile(fileVersion3);

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions([version2, version1] as FilesFile[])
			},
			Mutation: {
				cloneVersion: mockCloneVersion(version3 as FilesFile)
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={fileVersion2} />, { mocks });
		await screen.findByText(getChipLabel(fileVersion2.last_editor));

		const version2LastEditor = screen.getByText(getChipLabel(version2.last_editor));
		expect(version2LastEditor).toBeVisible();
		const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
		expect(version1LastEditor).toBeVisible();

		expect(screen.getByText('Current version')).toBeVisible();
		expect(screen.getByText('Last week')).toBeVisible();

		expect(screen.getAllByText(/Version \d/)).toHaveLength(2);

		const versionIcons = screen.getByTestId(SELECTORS.versionIcons(2));
		const versionMoreButton = within(versionIcons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versionMoreButton);

		const cloneAsCurrentItem = await screen.findByText(ACTION_REGEXP.cloneVersion);
		await user.click(cloneAsCurrentItem);

		await screen.findByText(/Version cloned as the current one/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(3);
	});

	test('download version', async () => {
		const downloadSpy = jest.spyOn(moduleUtils, 'downloadNode');

		const fileVersion1 = populateFile();
		fileVersion1.permissions.can_write_file = true;

		const version1 = getVersionFromFile(fileVersion1);

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions([version1] as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={fileVersion1} />, { mocks });
		await screen.findByText(getChipLabel(fileVersion1.last_editor));

		const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
		expect(version1LastEditor).toBeVisible();

		expect(screen.getByText('Current version')).toBeVisible();

		expect(screen.getByText(/Version \d/)).toBeInTheDocument();

		const versionIcons = screen.getByTestId(SELECTORS.versionIcons(1));
		const versionMoreButton = within(versionIcons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versionMoreButton);

		const downloadItem = await screen.findByText(/download version/i);
		await user.click(downloadItem);

		expect(downloadSpy).toBeCalledWith(fileVersion1.id, fileVersion1.version);
	});

	test('open with docs version', async () => {
		const openNodeWithDocsSpy = jest.fn();
		jest.spyOn(moduleUtils, 'openNodeWithDocs').mockImplementation(openNodeWithDocsSpy);

		const fileVersion1 = populateFile();
		fileVersion1.permissions.can_write_file = true;
		fileVersion1.mime_type = 'text/plain';

		const version1 = getVersionFromFile(fileVersion1);

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions([version1] as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={fileVersion1} />, { mocks });
		await screen.findByText(getChipLabel(fileVersion1.last_editor));

		const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
		expect(version1LastEditor).toBeVisible();

		expect(screen.getByText('Current version')).toBeVisible();

		expect(screen.getByText(/Version \d/)).toBeInTheDocument();

		const versionIcons = screen.getByTestId(SELECTORS.versionIcons(1));
		const versionMoreButton = within(versionIcons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versionMoreButton);

		const openDocumentItem = await screen.findByText(/open document version/i);
		await user.click(openDocumentItem);

		expect(openNodeWithDocsSpy).toBeCalledWith(fileVersion1.id, fileVersion1.version);
	});

	test('Upload version', async () => {
		const fileVersion1 = populateFile();
		fileVersion1.permissions.can_write_file = true;
		const fileVersion2 = incrementVersion(fileVersion1, true);
		const fileVersion3 = incrementVersion(fileVersion2, true);
		const fileVersion4 = incrementVersion(fileVersion3, true);
		const fileVersion5 = incrementVersion(fileVersion4, true);

		const dayOffset = 24 * 60 * 60 * 1000;
		fileVersion5.updated_at = Date.now();
		fileVersion4.updated_at = fileVersion5.updated_at - dayOffset;
		fileVersion3.updated_at = fileVersion4.updated_at - dayOffset;
		fileVersion2.updated_at = fileVersion3.updated_at - dayOffset;
		fileVersion1.updated_at = fileVersion2.updated_at - dayOffset;

		fileVersion5.keep_forever = false;
		fileVersion4.keep_forever = false;
		fileVersion3.keep_forever = false;
		fileVersion2.keep_forever = true;
		fileVersion1.keep_forever = false;

		const version1 = getVersionFromFile(fileVersion1);
		const version2 = getVersionFromFile(fileVersion2);
		const version3 = getVersionFromFile(fileVersion3);
		const version4 = getVersionFromFile(fileVersion4);
		const version5 = getVersionFromFile(fileVersion5);

		const versions = [
			version4 as FilesFile,
			version3 as FilesFile,
			version2 as FilesFile,
			version1 as FilesFile
		];

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions)
			}
		} satisfies Partial<Resolvers>;

		server.use(
			http.post<UploadVersionRequestParams, UploadRequestBody, UploadVersionResponse>(
				`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`,
				() =>
					HttpResponse.json({
						nodeId: fileVersion1.id,
						version: 5
					})
			),
			graphql.query<GetVersionsQuery, GetVersionsQueryVariables>(GetVersionsDocument, () =>
				HttpResponse.json({ data: { getVersions: [version5, ...versions] } })
			)
		);

		const { user } = setup(<Versioning node={fileVersion4} />, { mocks });
		await screen.findByText(getChipLabel(fileVersion4.last_editor));

		const version4LastEditor = screen.getByText(getChipLabel(version4.last_editor));
		expect(version4LastEditor).toBeVisible();
		const version3LastEditor = screen.getByText(getChipLabel(version3.last_editor));
		expect(version3LastEditor).toBeVisible();
		const version2LastEditor = screen.getByText(getChipLabel(version2.last_editor));
		expect(version2LastEditor).toBeVisible();
		const version1LastEditor = screen.getByText(getChipLabel(version1.last_editor));
		expect(version1LastEditor).toBeVisible();

		expect(screen.getByText('Current version')).toBeVisible();
		expect(screen.getByText('Last week')).toBeVisible();
		expect(screen.getAllByText(/Version \d/)).toHaveLength(4);

		const uploadButton = await screen.findByRole('button', { name: /upload version/i });
		await user.click(uploadButton);

		const file = new File(['(⌐□_□)'], fileVersion5.name, { type: fileVersion5.mime_type });
		const input = await screen.findByAltText(/Hidden file input/i);
		await user.upload(input, file);

		await waitFor(() => expect(screen.getAllByText(/Version \d/)).toHaveLength(5));
		const version5LastEditor = screen.getByText(getChipLabel(version5.last_editor));
		expect(version5LastEditor).toBeVisible();
	});

	test('clone action is disabled if max number of version is reached', async () => {
		const versions = [];
		const configs = populateConfigs();
		const maxVersions = Number(
			find(configs, (config) => config.name === CONFIGS.MAX_VERSIONS)?.value || 0
		);
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = true;
		for (let i = 0; i < maxVersions; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(maxVersions);

		const versions1Icons = screen.getByTestId(SELECTORS.versionIcons(1));
		const versions1MoreButton = within(versions1Icons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versions1MoreButton);

		const cloneAsCurrentItem = await screen.findByText(ACTION_REGEXP.cloneVersion);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(cloneAsCurrentItem).toHaveAttribute('disabled', '');
		// register tooltip listeners
		jest.advanceTimersToNextTimer();
		// hover on action shows a tooltip
		await user.hover(cloneAsCurrentItem);
		const tooltip = await screen.findByText(/you have reached the maximum number of versions/i);
		expect(tooltip).toBeVisible();
		await user.unhover(cloneAsCurrentItem);
		expect(tooltip).not.toBeInTheDocument();

		await user.click(cloneAsCurrentItem);
		expect(screen.queryByText(/Version cloned as the current one/i)).not.toBeInTheDocument();
		// number of version is not changed
		expect(screen.getAllByText(/Version \d/)).toHaveLength(maxVersions);
		expect(screen.getByText(ACTION_REGEXP.cloneVersion)).toBeVisible();
	});

	test('keep forever action is disabled if max number of keep is reached', async () => {
		const versions = [];
		const configs = populateConfigs();
		const maxKeepVersions = Number(
			find(configs, (config) => config.name === CONFIGS.MAX_KEEP_VERSIONS)?.value || 0
		);
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = true;
		for (let i = 0; i < maxKeepVersions; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			fileVersion.keep_forever = true;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}
		// add a version without keep
		const fileVersionWithoutKeep = { ...baseFile };
		fileVersionWithoutKeep.version = maxKeepVersions + 1;
		fileVersionWithoutKeep.keep_forever = false;
		const versionWithoutKeep = getVersionFromFile(fileVersionWithoutKeep);
		versions.unshift(versionWithoutKeep);

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);
		expect(screen.getAllByTestId(ICON_REGEXP.versionKeepForever)).toHaveLength(maxKeepVersions);

		const versionWithoutKeepIcons = screen.getByTestId(
			SELECTORS.versionIcons(versionWithoutKeep.version)
		);
		const versionWithoutKeepMoreButton = within(versionWithoutKeepIcons).getByTestId(
			ICON_REGEXP.moreVertical
		);
		await user.click(versionWithoutKeepMoreButton);

		const keepVersionItem = await screen.findByText(/keep this version forever/i);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(keepVersionItem).toHaveAttribute('disabled', '');
		// register tooltip listeners
		jest.advanceTimersToNextTimer();

		// hover on action shows a tooltip
		await user.hover(keepVersionItem);
		const tooltip = await screen.findByText(
			/You have reached the maximum number of versions to keep forever/i
		);
		expect(tooltip).toBeVisible();
		await user.unhover(keepVersionItem);
		expect(tooltip).not.toBeInTheDocument();

		await user.click(keepVersionItem);
		expect(screen.queryByText(/Version marked as to be kept forever/i)).not.toBeInTheDocument();

		// click outside to close context menu
		await user.click(screen.getByText(RegExp(`version ${versionWithoutKeep.version}`, 'i')));
		expect(screen.queryByText(/keep this version forever/i)).not.toBeInTheDocument();
		expect(screen.getAllByTestId(ICON_REGEXP.versionKeepForever)).toHaveLength(maxKeepVersions);
	});

	test('upload version action is enabled if max number of versions is reached', async () => {
		const versions = [];
		const configs = populateConfigs();
		const maxVersions = Number(
			find(configs, (config) => config.name === CONFIGS.MAX_VERSIONS)?.value || 0
		);
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = true;
		for (let i = 0; i < maxVersions; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}

		const fileVersionUpload = { ...baseFile };
		fileVersionUpload.version = maxVersions + 1;
		const versionUpload = getVersionFromFile(fileVersionUpload);

		// remove first version from list to simulate auto-deletion of backend
		const updatedVersions = [versionUpload].concat(versions.slice(0, versions.length - 1));
		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		server.use(
			http.post<UploadVersionRequestParams, UploadRequestBody, UploadVersionResponse>(
				`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`,
				() =>
					HttpResponse.json({
						nodeId: baseFile.id,
						version: fileVersionUpload.version
					})
			),
			graphql.query<GetVersionsQuery, GetVersionsQueryVariables>(GetVersionsDocument, () =>
				HttpResponse.json({ data: { getVersions: updatedVersions } })
			)
		);

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(maxVersions);

		const uploadButton = await screen.findByRole('button', { name: /upload version/i });
		expect(uploadButton).toBeVisible();
		expect(uploadButton).toBeEnabled();
		await user.click(uploadButton);

		const file = new File(['(⌐□_□)'], fileVersionUpload.name, {
			type: fileVersionUpload.mime_type
		});
		const input = await screen.findByAltText(/Hidden file input/i);
		await user.upload(input, file);

		await screen.findByText(RegExp(`version ${versionUpload.version}`, 'i'));
		// uploaded version is visible and first version is removed from list
		expect(screen.getByText(RegExp(`version ${versionUpload.version}`, 'i'))).toBeVisible();
		expect(screen.queryByText(/version 1/i)).not.toBeInTheDocument();
	});

	test('remove keep forever action is enabled if max version of keep is reached', async () => {
		const versions = [];
		const configs = populateConfigs();
		const maxKeepVersions = Number(
			find(configs, (config) => config.name === CONFIGS.MAX_KEEP_VERSIONS)?.value || 0
		);
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = true;
		for (let i = 0; i < maxKeepVersions; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			fileVersion.keep_forever = true;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			},
			Mutation: {
				keepVersions: mockKeepVersions([1])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);
		expect(screen.getAllByTestId(ICON_REGEXP.versionKeepForever)).toHaveLength(maxKeepVersions);

		const versionIcons = screen.getByTestId(SELECTORS.versionIcons(1));
		expect(within(versionIcons).getByTestId(ICON_REGEXP.versionKeepForever)).toBeVisible();
		const versionMoreButton = within(versionIcons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versionMoreButton);

		const keepVersionItem = await screen.findByText(/remove keep forever/i);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(keepVersionItem.parentElement).not.toHaveAttribute('disabled', '');
		await user.click(keepVersionItem);

		await screen.findByText(/Keep forever removed/i);

		expect(screen.queryByText(/rmeove keep forever/i)).not.toBeInTheDocument();
		expect(
			within(versionIcons).queryByTestId(ICON_REGEXP.versionKeepForever)
		).not.toBeInTheDocument();
		expect(screen.getAllByTestId(ICON_REGEXP.versionKeepForever)).toHaveLength(maxKeepVersions - 1);
	});

	test('delete version is enabled if max number of versions is reached and node is not marked to be kept forever', async () => {
		const versions = [];
		const configs = populateConfigs();
		const maxVersions = Number(
			find(configs, (config) => config.name === CONFIGS.MAX_VERSIONS)?.value || 0
		);
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = true;
		for (let i = 0; i < maxVersions; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			fileVersion.keep_forever = false;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			},
			Mutation: {
				deleteVersions: mockDeleteVersions([1])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(maxVersions);

		const version2Icons = screen.getByTestId(SELECTORS.versionIcons(1));
		const version2MoreButton = within(version2Icons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(version2MoreButton);

		const deleteVersionItem = await screen.findByText(/delete version/i);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(deleteVersionItem).not.toHaveAttribute('disabled', '');
		await user.click(deleteVersionItem);
		await waitFor(() => expect(screen.getAllByText(/Version \d/i)).toHaveLength(maxVersions - 1));
		expect(screen.getAllByText(/Version \d/)).toHaveLength(maxVersions - 1);
		expect(screen.queryByText(/version 1/i)).not.toBeInTheDocument();
	});

	test('purge all is enabled if max number of versions is reached', async () => {
		const versions = [];
		const configs = populateConfigs();
		const maxVersions = Number(
			find(configs, (config) => config.name === CONFIGS.MAX_VERSIONS)?.value || 0
		);
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = true;
		for (let i = 0; i < maxVersions; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			fileVersion.keep_forever = false;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}

		const purgedVersions = map(versions.slice(1), (version) => version.version);
		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			},
			Mutation: {
				deleteVersions: mockDeleteVersions(purgedVersions)
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(maxVersions);

		const purgeAllButton = await screen.findByRole('button', { name: /purge all versions/i });
		expect(purgeAllButton).toBeEnabled();
		await user.click(purgeAllButton);
		await screen.findByText(
			/All versions that are not marked to be kept forever, except the current one, will be deleted/i
		);
		const purgeAllButtons = screen.getAllByRole('button', { name: /purge all versions/i });
		expect(purgeAllButtons).toHaveLength(2);
		const purgeAllModalButton = find(purgeAllButtons, (button) => button !== purgeAllButton);
		expect(purgeAllModalButton).toBeDefined();
		await user.click(purgeAllModalButton as HTMLElement);
		await screen.findByRole('button', { name: /purge all versions/i });
		// only version 1 is visible
		expect(screen.getByText(/Version \d/i)).toBeVisible();
		expect(screen.getByText(RegExp(`version ${maxVersions}`, 'i'))).toBeVisible();
	});

	test('clone version is disabled and shows a tooltip if user does not have write permissions', async () => {
		const versions = [];
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = false;
		const maxVersions = 10;
		for (let i = 0; i < maxVersions - 2; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(
					populateConfigs({
						[CONFIGS.MAX_VERSIONS]: `${maxVersions}`
					})
				),
				getVersions: mockGetVersions(versions as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);

		const versions1Icons = screen.getByTestId(SELECTORS.versionIcons(1));
		const versions1MoreButton = within(versions1Icons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versions1MoreButton);

		const cloneAsCurrentItem = await screen.findByText(ACTION_REGEXP.cloneVersion);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(cloneAsCurrentItem).toHaveAttribute('disabled', '');
		// register tooltip listeners
		jest.advanceTimersToNextTimer();
		// hover on action shows a tooltip
		await user.hover(cloneAsCurrentItem);
		const tooltip = await screen.findByText(/you don't have the correct permissions/i);
		expect(tooltip).toBeVisible();
		await user.unhover(cloneAsCurrentItem);
		expect(tooltip).not.toBeInTheDocument();

		await user.click(cloneAsCurrentItem);
		expect(screen.queryByText(/Version cloned as the current one/i)).not.toBeInTheDocument();
		// number of version is not changed
		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);
	});

	test('delete version is disabled and shows a tooltip if user does not have write permissions', async () => {
		const versions = [];
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = false;
		const maxVersions = 10;
		for (let i = 0; i < maxVersions - 2; i += 1) {
			const fileVersion = { ...baseFile };
			fileVersion.version = i + 1;
			const version = getVersionFromFile(fileVersion);
			versions.unshift(version);
		}

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(
					populateConfigs({
						[CONFIGS.MAX_VERSIONS]: `${maxVersions}`
					})
				),
				getVersions: mockGetVersions(versions as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);

		const versions1Icons = screen.getByTestId(SELECTORS.versionIcons(1));
		const versions1MoreButton = within(versions1Icons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versions1MoreButton);

		const deleteVersion = await screen.findByText(/delete version/i);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(deleteVersion).toHaveAttribute('disabled', '');
		// register tooltip listeners
		jest.advanceTimersToNextTimer();

		// hover on action shows a tooltip
		await user.hover(deleteVersion);
		const tooltip = await screen.findByText(/you don't have the correct permissions/i);
		expect(tooltip).toBeVisible();
		await user.unhover(deleteVersion);
		expect(tooltip).not.toBeInTheDocument();

		await user.click(deleteVersion);
		expect(screen.getByText(/version 1/i)).toBeVisible();
		// number of version is not changed
		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);
	});

	test('open with docs is disabled and shows a tooltip if file cannot be opened with docs', async () => {
		const baseFile = populateFile();
		baseFile.mime_type = 'image/png';
		baseFile.type = NodeType.Image;
		baseFile.extension = 'png';
		baseFile.permissions.can_write_file = true;
		const version = getVersionFromFile(baseFile);
		const versions = [version];

		const openNodeWithDocsSpy = jest.fn();
		jest.spyOn(moduleUtils, 'openNodeWithDocs').mockImplementation(openNodeWithDocsSpy);

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);

		const versions1Icons = screen.getByTestId(SELECTORS.versionIcons(1));
		const versions1MoreButton = within(versions1Icons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versions1MoreButton);

		const openDocumentVersion = await screen.findByText(/open document version/i);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(openDocumentVersion).toHaveAttribute('disabled', '');
		// register tooltip listeners
		jest.advanceTimersToNextTimer();

		// hover on action shows a tooltip
		await user.hover(openDocumentVersion);
		const tooltip = await screen.findByText(/This version cannot be opened by the online editor/i);
		expect(tooltip).toBeVisible();
		await user.unhover(openDocumentVersion);
		expect(tooltip).not.toBeInTheDocument();

		await user.click(openDocumentVersion);
		expect(openNodeWithDocsSpy).not.toHaveBeenCalled();
	});

	test('keep version forever is disabled and shows a tooltip if user does not have permissions', async () => {
		const baseFile = populateFile();
		baseFile.permissions.can_write_file = false;
		const version = getVersionFromFile(baseFile);
		const versions = [version];

		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions(versions as FilesFile[])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={baseFile} />, { mocks });
		await screen.findByText(/Version 1/i);

		expect(screen.getAllByText(/Version \d/)).toHaveLength(versions.length);

		const versions1Icons = screen.getByTestId(SELECTORS.versionIcons(1));
		const versions1MoreButton = within(versions1Icons).getByTestId(ICON_REGEXP.moreVertical);
		await user.click(versions1MoreButton);

		const keepVersion = await screen.findByText(/(keep this version forever|remove keep forever)/i);
		// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
		expect(keepVersion).toHaveAttribute('disabled', '');
		// register tooltip listeners
		jest.advanceTimersToNextTimer();

		// hover on action shows a tooltip
		await user.hover(keepVersion);
		const tooltip = await screen.findByText(/you don't have the correct permissions/i);
		expect(tooltip).toBeVisible();
		await user.unhover(keepVersion);
		expect(tooltip).not.toBeInTheDocument();

		await user.click(keepVersion);
		expect(screen.queryByText(/version marked as to be kept forever/i)).not.toBeInTheDocument();
	});

	it('should show the over quota error snackbar if clone action fails for over quota', async () => {
		const fileVersion1 = populateFile();
		fileVersion1.permissions.can_write_file = true;
		const version1 = getVersionFromFile(fileVersion1);
		const mocks = {
			Query: {
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions([version1] as FilesFile[])
			},
			Mutation: {
				cloneVersion: mockErrorResolver(
					generateError('Clone action failed', { code: ERROR_CODE.overQuotaReached })
				)
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<Versioning node={fileVersion1} />, { mocks });
		await screen.findByText(getChipLabel(fileVersion1.last_editor));
		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.moreVertical }));
		await user.click(screen.getByText(ACTION_REGEXP.cloneVersion));
		await screen.findByText(
			'Clone action failed. You have reached your storage limit. Delete some items to free up storage space and try again'
		);
	});
});
