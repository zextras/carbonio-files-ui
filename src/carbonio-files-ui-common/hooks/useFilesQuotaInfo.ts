/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useState } from 'react';

import { mySelfQuota } from '../../network/mySelfQuota';

export const useFilesQuotaInfo = (): {
	limit: number | undefined;
	used: number | undefined;
	responseReceived: boolean;
	requestFailed: boolean;
	refreshData: () => void;
} => {
	const [state, setState] = useState<{
		limit: number | undefined;
		used: number | undefined;
		responseReceived: boolean;
		requestFailed: boolean;
	}>({
		limit: undefined,
		used: undefined,
		responseReceived: false,
		requestFailed: false
	});

	const refreshData = useCallback(() => {
		mySelfQuota()
			.then((response) => {
				setState({
					limit: response.limit,
					used: response.used,
					responseReceived: true,
					requestFailed: false
				});
			})
			.catch(() => {
				setState((prevState) => ({
					...prevState,
					responseReceived: true,
					requestFailed: true
				}));
			});
	}, []);

	useEffect(() => {
		mySelfQuota()
			.then((response) => {
				setState({
					limit: response.limit,
					used: response.used,
					responseReceived: true,
					requestFailed: false
				});
			})
			.catch(() => {
				setState((prevState) => ({
					...prevState,
					responseReceived: true,
					requestFailed: true
				}));
			});
	}, []);

	return { ...state, refreshData };
};
