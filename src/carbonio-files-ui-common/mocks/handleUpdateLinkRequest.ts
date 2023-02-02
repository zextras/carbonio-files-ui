/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { UpdateLinkMutation, UpdateLinkMutationVariables } from '../types/graphql/types';

const handleUpdateLinkRequest: ResponseResolver<
	GraphQLRequest<UpdateLinkMutationVariables>,
	GraphQLContext<UpdateLinkMutation>,
	UpdateLinkMutation
> = (req, res, ctx) => {
	const { link_id: id, description, expires_at: expiresAt } = req.variables;
	const link: UpdateLinkMutation['updateLink'] = {
		__typename: 'Link',
		id,
		description,
		expires_at: expiresAt,
		url: faker.internet.url(),
		created_at: faker.date.recent().getTime()
	};

	return res(
		ctx.data({
			updateLink: link
		})
	);
};

export default handleUpdateLinkRequest;
