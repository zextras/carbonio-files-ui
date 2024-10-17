/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { UpdateLinkMutation, UpdateLinkMutationVariables } from '../types/graphql/types';

const handleUpdateLinkRequest: GraphQLResponseResolver<
	UpdateLinkMutation,
	UpdateLinkMutationVariables
> = ({ variables }) => {
	const { link_id: id, description, expires_at: expiresAt, access_code: accessCode } = variables;
	const link: UpdateLinkMutation['updateLink'] = {
		__typename: 'Link',
		id,
		description: description ?? null,
		access_code: accessCode ?? null,
		expires_at: expiresAt ?? null,
		url: faker.internet.url(),
		created_at: faker.date.recent().getTime()
	};

	return HttpResponse.json({
		data: {
			updateLink: link
		}
	});
};

export default handleUpdateLinkRequest;
