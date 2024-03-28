/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateFolder } from './mockUtils';
import { CreateFolderMutation, CreateFolderMutationVariables } from '../types/graphql/types';

const handleCreateFolderRequest: GraphQLResponseResolver<
	CreateFolderMutation,
	CreateFolderMutationVariables
> = ({ variables }) => {
	const { name } = variables;
	const folder = populateFolder(0, undefined, name);

	return HttpResponse.json({
		data: {
			createFolder: folder
		}
	});
};

export default handleCreateFolderRequest;
