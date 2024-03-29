/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { populateShare, populateUser } from './mockUtils';
import { Node } from '../types/common';
import { UpdateShareMutation, UpdateShareMutationVariables } from '../types/graphql/types';

const handleUpdateShareRequest: ResponseResolver<
	GraphQLRequest<UpdateShareMutationVariables>,
	GraphQLContext<UpdateShareMutation>,
	UpdateShareMutation
> = (req, res, ctx) => {
	const { node_id: nodeId, share_target_id: shareTargetId, permission } = req.variables;
	const share = populateShare({ id: nodeId } as Node, '', populateUser(shareTargetId));
	share.permission = permission;

	return res(
		ctx.data({
			updateShare: share
		})
	);
};

export default handleUpdateShareRequest;
