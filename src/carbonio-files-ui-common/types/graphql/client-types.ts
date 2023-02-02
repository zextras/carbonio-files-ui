/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export enum UploadStatus {
	COMPLETED = 'Completed',
	LOADING = 'Loading',
	FAILED = 'Failed',
	QUEUED = 'Queued'
	// PAUSED: 'Paused'(tentative)
}

export interface UploadItem {
	file: File | null;
	// reference to the id of the parent node of Files after it is created
	parentId: string | null;
	parentNodeId: string | null;
	status: UploadStatus;
	progress: number; // (should be rounded down)
	id: string;
	// reference to the id of the node of Files after it is created
	nodeId: string | null;
	name: string;
	fullPath: string;
}
