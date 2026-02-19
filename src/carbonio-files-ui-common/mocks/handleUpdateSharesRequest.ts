/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateShare, populateUser } from './mockUtils';
import { Share, UpdateSharesMutation, UpdateSharesMutationVariables } from '../types/graphql/types';

const handleUpdateSharesRequest: GraphQLResponseResolver<
	UpdateSharesMutation,
	UpdateSharesMutationVariables
> = ({ variables }) => {
	const { node_id: nodeId, share_target_ids: shareTargetIdsRaw, permission } = variables;
	const shareTargetIds = Array.isArray(shareTargetIdsRaw) ? shareTargetIdsRaw : [shareTargetIdsRaw];
	const shares = shareTargetIds.map((shareTargetId: string) => {
		const share = populateShare({ id: nodeId } as Share['node'], '', populateUser(shareTargetId));
		share.permission = permission;
		return share;
	});

	return HttpResponse.json({
		data: {
			updateShares: shares
		}
	});
};

export default handleUpdateSharesRequest;
