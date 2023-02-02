/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { TypePolicy } from '@apollo/client';

import { findNodesFieldPolicy } from './fieldPolicies/findNodes';
import { getNodeFieldPolicy } from './fieldPolicies/getNode';
import { getUploadItemFieldPolicy } from './fieldPolicies/getUploadItem';
import { getUploadItemsFieldPolicy } from './fieldPolicies/getUploadItems';
import { getVersionsFieldPolicy } from './fieldPolicies/getVersions';

export const queryTypePolicies: TypePolicy = {
	fields: {
		findNodes: findNodesFieldPolicy,
		getVersions: getVersionsFieldPolicy,
		getNode: getNodeFieldPolicy,
		getUploadItems: getUploadItemsFieldPolicy,
		getUploadItem: getUploadItemFieldPolicy
	}
};
