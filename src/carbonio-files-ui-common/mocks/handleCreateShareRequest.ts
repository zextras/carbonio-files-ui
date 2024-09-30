/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateShare, populateUser } from './mockUtils';
import { CreateShareMutation, CreateShareMutationVariables, Share } from '../types/graphql/types';

const handleCreateShareRequest: GraphQLResponseResolver<
	CreateShareMutation,
	CreateShareMutationVariables
> = ({ variables }) => {
	const { node_id: nodeId, share_target_id: shareTargetId, permission } = variables;
	const share = populateShare({ id: nodeId } as Share['node'], '', populateUser(shareTargetId));
	share.permission = permission;

	return HttpResponse.json({
		data: {
			createShare: share
		}
	});
};

export default handleCreateShareRequest;
