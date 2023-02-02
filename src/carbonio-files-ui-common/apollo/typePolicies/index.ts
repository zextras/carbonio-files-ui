/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { TypePolicies } from '@apollo/client';

import { folderTypePolicies } from './Folder';
import { nodeTypePolicies } from './Node';
import { queryTypePolicies } from './Query';

export const typePolicies: TypePolicies = {
	Node: nodeTypePolicies,
	Folder: folderTypePolicies,
	Query: queryTypePolicies
};
