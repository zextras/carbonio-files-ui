/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useMemo } from 'react';

import { useQuery } from '@apollo/client';
import { reduce } from 'lodash';

import GET_CONFIGS from '../../../graphql/queries/getConfigs.graphql';
import { Config, GetConfigsQuery, GetConfigsQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

type ConfigMap = Record<Config['name'], Config['value']>;

export function useGetConfigsQuery(): ConfigMap {
	const { data, error } = useQuery<GetConfigsQuery, GetConfigsQueryVariables>(GET_CONFIGS);

	useErrorHandler(error, 'GET_CONFIGS');

	return useMemo(
		() =>
			reduce<Config | null, ConfigMap>(
				data?.getConfigs,
				(accumulator, config) => {
					if (config) {
						accumulator[config.name] = config.value;
					}
					return accumulator;
				},
				{}
			),
		[data]
	);
}
