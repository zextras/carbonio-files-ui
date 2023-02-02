/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { CreateShareMutation, CreateShareMutationVariables, Node } from '../types/graphql/types';
import { populateShare, populateUser } from './mockUtils';

const handleCreateShareRequest: ResponseResolver<
	GraphQLRequest<CreateShareMutationVariables>,
	GraphQLContext<CreateShareMutation>,
	CreateShareMutation
> = (req, res, ctx) => {
	const { node_id: nodeId, share_target_id: shareTargetId, permission } = req.variables;
	const share = populateShare({ id: nodeId } as Node, '', populateUser(shareTargetId));
	share.permission = permission;

	return res(
		ctx.data({
			createShare: share
		})
	);
};

export default handleCreateShareRequest;
