/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateLink } from './mockUtils';
import { Node } from '../types/common';
import { CreateLinkMutation, CreateLinkMutationVariables } from '../types/graphql/types';

const handleCreateLinkRequest: GraphQLResponseResolver<
	CreateLinkMutation,
	CreateLinkMutationVariables
> = ({ variables }) => {
	const { node_id: nodeId, description, expires_at: expiresAt } = variables;
	const link = populateLink({ id: nodeId } as Node);
	link.expires_at = expiresAt;
	link.description = description;

	return HttpResponse.json({
		data: {
			createLink: link
		}
	});
};

export default handleCreateLinkRequest;
