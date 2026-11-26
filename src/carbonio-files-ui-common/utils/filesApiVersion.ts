/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { forEach } from 'lodash';
import { SemVer } from 'semver';

import { isCarbonioCEVar } from '../apollo/isCarbonioCEVar';
import {
	ERROR_CODE,
	FILES_API_VERSION_HEADER,
	FILES_API_VERSIONS,
	FILES_API_VERSIONS_PATH,
	HTTP_STATUS_CODE,
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

const isSnapshot = (version: SemVer): boolean => {
	const last = version.prerelease[version.prerelease.length - 1];
	return typeof last === 'string' && last.endsWith('SNAPSHOT');
};

export const compareVersions = (a: string, b: string): number => {
	if (a === b) {
		return 0;
	}
	if (a === CURRENT) {
		return 1;
	}
	if (b === CURRENT) {
		return -1;
	}
	const versionA = new SemVer(a);
	const versionB = new SemVer(b);
	const main = versionA.compareMain(versionB);
	if (main !== 0) {
		return main;
	}
	const snapshotA = isSnapshot(versionA);
	const snapshotB = isSnapshot(versionB);
	if (snapshotA !== snapshotB) {
		return snapshotA ? 1 : -1;
	}
	return versionA.comparePre(versionB);
};

const hasUnsupportedVersionCode = (body: unknown): boolean =>
	typeof body === 'object' &&
	body !== null &&
	'code' in body &&
	body.code === ERROR_CODE.unsupportedApiVersion;

export const isUnsupportedVersionBody = (text: string | null | undefined): boolean => {
	try {
		return hasUnsupportedVersionCode(JSON.parse(text ?? ''));
	} catch {
		return false;
	}
};

export const isUnsupportedVersionResponse = async (response: Response): Promise<boolean> => {
	if (response.status !== HTTP_STATUS_CODE.unprocessableEntity) {
		return false;
	}
	try {
		return hasUnsupportedVersionCode(await response.clone().json());
	} catch {
		return false;
	}
};

export const isUnsupportedVersionXhr = (xhr: XMLHttpRequest): boolean =>
	xhr.status === HTTP_STATUS_CODE.unprocessableEntity &&
	isUnsupportedVersionBody(typeof xhr.response === 'string' ? xhr.response : xhr.responseText);

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

export const filesApiNewerThan = (
	{ edition, version }: FilesApi,
	after: Partial<Record<FilesEdition, string>>
): boolean => {
	const threshold = after[edition];
	return (
		threshold !== undefined && version !== undefined && compareVersions(version, threshold) > 0
	);
};

export const getFilesApiVersionHeaders = async (): Promise<Record<string, string>> => {
	const { version } = await getFilesApi();
	if (version === undefined) {
		throw new UnsupportedFilesApiError('No Files API version in common with the server');
	}
	return { [FILES_API_VERSION_HEADER]: version };
};

export const fetchWithFilesApiVersion = async (
	url: string,
	init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> => {
	const send = async (): Promise<Response> =>
		fetch(url, { ...init, headers: { ...init.headers, ...(await getFilesApiVersionHeaders()) } });
	const response = await send();
	if (await isUnsupportedVersionResponse(response)) {
		resetFilesApi();
		return send();
	}
	return response;
};

export const sendWithFilesApiVersion = (
	xhr: XMLHttpRequest,
	url: string,
	headers: Record<string, string> | ((api: FilesApi) => Record<string, string>),
	body: XMLHttpRequestBodyInit
): void => {
	getFilesApi()
		.then((api) => {
			if (api.version === undefined) {
				throw new UnsupportedFilesApiError('No Files API version in common with the server');
			}
			xhr.open('POST', url, true);
			forEach(
				{
					[FILES_API_VERSION_HEADER]: api.version,
					...(typeof headers === 'function' ? headers(api) : headers)
				},
				(value, name) => xhr.setRequestHeader(name, value)
			);
			xhr.send(body);
		})
		.catch(() => xhr.dispatchEvent(new ProgressEvent('error')));
};
