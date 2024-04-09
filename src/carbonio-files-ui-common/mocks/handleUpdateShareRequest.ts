/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateShare, populateUser } from './mockUtils';
import { Node } from '../types/common';
import { UpdateShareMutation, UpdateShareMutationVariables } from '../types/graphql/types';

const handleUpdateShareRequest: GraphQLResponseResolver<
	UpdateShareMutation,
	UpdateShareMutationVariables
> = ({ variables }) => {
	const { node_id: nodeId, share_target_id: shareTargetId, permission } = variables;
	const share = populateShare({ id: nodeId } as Node, '', populateUser(shareTargetId));
	share.permission = permission;

	return HttpResponse.json({
		data: {
			updateShare: share
		}
	});
};

export default handleUpdateShareRequest;
