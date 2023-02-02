/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { CreateFolderMutation, CreateFolderMutationVariables } from '../types/graphql/types';
import { populateFolder } from './mockUtils';

const handleCreateFolderRequest: ResponseResolver<
	GraphQLRequest<CreateFolderMutationVariables>,
	GraphQLContext<CreateFolderMutation>,
	CreateFolderMutation
> = (req, res, ctx) => {
	const { name } = req.variables;
	const folder = populateFolder(0, undefined, name);

	return res(
		ctx.data({
			createFolder: folder
		})
	);
};

export default handleCreateFolderRequest;
