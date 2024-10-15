/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import {
	UpdateLinkDocument,
	UpdateLinkMutation,
	UpdateLinkMutationVariables
} from '../../../types/graphql/types';
import { ErrorHandlerOptions, useErrorHandler } from '../../useErrorHandler';

export type UpdateLinkType = (
	id: string,
	description?: string,
	expiresAt?: number,
	accessCode?: string
) => Promise<FetchResult<UpdateLinkMutation>>;

/**
 * Can return error: ErrorCode.LINK_NOT_FOUND
 */
export function useUpdateLinkMutation(errorHandlerOptions?: ErrorHandlerOptions): UpdateLinkType {
	const [updateLinkMutation, { error: updateLinkError }] = useMutation<
		UpdateLinkMutation,
		UpdateLinkMutationVariables
	>(UpdateLinkDocument);

	const updateLink: UpdateLinkType = useCallback(
		(id: string, description?: string, expiresAt?: number, accessCode?: string) =>
			updateLinkMutation({
				variables: {
					link_id: id,
					description,
					expires_at: expiresAt,
					access_code: accessCode
				}
			}),
		[updateLinkMutation]
	);
	useErrorHandler(updateLinkError, 'UPDATE_LINK', errorHandlerOptions);

	return updateLink;
}
