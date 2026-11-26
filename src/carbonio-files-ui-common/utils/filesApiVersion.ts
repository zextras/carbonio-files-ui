/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { forEach } from 'lodash';
import { compare } from 'semver';

import { isCarbonioCEVar } from '../apollo/isCarbonioCEVar';
import {
	FILES_API_VERSION_HEADER,
	FILES_API_VERSIONS,
	FILES_API_VERSIONS_PATH,
	REST_ENDPOINT
} from '../constants';
import { FilesEdition } from '../types/common';

export type FilesApiServerVersions = {
	edition: FilesEdition;
	current: string;
	oldestSupported: string;
};

export type FilesApi = {
	edition: FilesEdition;
	version: string | undefined;
};

export class UnsupportedFilesApiError extends Error {}

const CURRENT = 'current';

const compareVersions = (a: string, b: string): number => {
	if (a === b) {
		return 0;
	}
	if (a === CURRENT) {
		return 1;
	}
	if (b === CURRENT) {
		return -1;
	}
	return compare(a, b);
};

export const negotiateVersion = (
	client: { oldest: string; newest: string },
	server: Pick<FilesApiServerVersions, 'current' | 'oldestSupported'>
): string | undefined => {
	const newest =
		compareVersions(client.newest, server.current) < 0 ? client.newest : server.current;
	const oldest =
		compareVersions(client.oldest, server.oldestSupported) > 0
			? client.oldest
			: server.oldestSupported;
	return compareVersions(newest, oldest) >= 0 ? newest : undefined;
};

const discover = async (): Promise<FilesApi> => {
	const response = await fetch(`${REST_ENDPOINT}${FILES_API_VERSIONS_PATH}`);
	if (response.status === 404) {
		const edition: FilesEdition = (isCarbonioCEVar() ?? true) ? 'ce' : 'advanced';
		return { edition, version: FILES_API_VERSIONS[edition].oldest };
	}
	if (!response.ok) {
		throw new Error(`Files API versions not available: ${response.status}`);
	}
	const server: FilesApiServerVersions = await response.json();
	return {
		edition: server.edition,
		version: negotiateVersion(FILES_API_VERSIONS[server.edition], server)
	};
};

let negotiation: Promise<FilesApi> | undefined;

export const getFilesApi = (): Promise<FilesApi> => {
	negotiation ??= discover().catch((error: unknown) => {
		negotiation = undefined;
		throw error;
	});
	return negotiation;
};

export const resetFilesApi = (): void => {
	negotiation = undefined;
};

export const getFilesApiVersionHeaders = async (): Promise<Record<string, string>> => {
	const { version } = await getFilesApi();
	if (version === undefined) {
		throw new UnsupportedFilesApiError('No Files API version in common with the server');
	}
	return { [FILES_API_VERSION_HEADER]: version };
};

export const sendWithFilesApiVersion = (
	xhr: XMLHttpRequest,
	url: string,
	headers: Record<string, string>,
	body: XMLHttpRequestBodyInit
): void => {
	getFilesApiVersionHeaders()
		.then((versionHeaders) => {
			xhr.open('POST', url, true);
			forEach({ ...versionHeaders, ...headers }, (value, name) =>
				xhr.setRequestHeader(name, value)
			);
			xhr.send(body);
		})
		.catch(() => xhr.dispatchEvent(new ProgressEvent('error')));
};
