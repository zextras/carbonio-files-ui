/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { populateLink } from './mockUtils';
import { Node } from '../types/common';
import { CreateLinkMutation, CreateLinkMutationVariables } from '../types/graphql/types';

const handleCreateLinkRequest: ResponseResolver<
	GraphQLRequest<CreateLinkMutationVariables>,
	GraphQLContext<CreateLinkMutation>,
	CreateLinkMutation
> = (req, res, ctx) => {
	const { node_id: nodeId, description, expires_at: expiresAt } = req.variables;
	const link = populateLink({ id: nodeId } as Node);
	link.expires_at = expiresAt;
	link.description = description;

	return res(
		ctx.data({
			createLink: link
		})
	);
};

export default handleCreateLinkRequest;
