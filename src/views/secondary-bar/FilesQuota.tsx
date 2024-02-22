/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { Container, Icon, Quota, Text, Tooltip } from '@zextras/carbonio-design-system';

import { humanFileSize } from '../../carbonio-files-ui-common/utils/utils';
import { useFilesQuotaInfo } from '../../hooks/useFilesQuotaInfo';

function assertIsNumber(val: unknown): asserts val is number {
	if (typeof val !== 'number') {
		throw new Error('Not a number!');
	}
}

export function getPercentage(used: number, limit: number): number {
	return Math.min(100, Math.floor((used / limit) * 100));
}

const InnerFilesQuota = ({ used, limit }: { used: number; limit: number }): React.JSX.Element => {
	const quotaString = useMemo(() => {
		if (limit === 0) {
			return `${humanFileSize(used)} of unlimited space`;
		}
		return `${humanFileSize(used)} of ${humanFileSize(limit)} used`;
	}, [used, limit]);

	const fillProp = useMemo(() => getPercentage(used, limit), [limit, used]);

	return (
		<Container
			data-testid="files-quota"
			crossAlignment={'flex-start'}
			height="fit"
			padding={{ vertical: '1rem', horizontal: '0.5rem' }}
		>
			<Container orientation={'row'} mainAlignment={'flex-start'} gap={'0.5rem'}>
				<Text>{quotaString}</Text>
				{fillProp >= 100 && (
					<Tooltip label={'You have reached the maximum quota'}>
						<Icon icon={'AlertCircleOutline'} color={'error'} />
					</Tooltip>
				)}
			</Container>
			{limit > 0 && <Quota fill={fillProp} fillBackground={fillProp < 100 ? 'info' : 'error'} />}
		</Container>
	);
};

export const FilesQuota = (): React.JSX.Element | null => {
	const { used, limit, responseReceived, requestFailed } = useFilesQuotaInfo();

	return useMemo((): null | React.JSX.Element => {
		if (!responseReceived) {
			return null;
		}
		if (requestFailed) {
			return null;
		}
		assertIsNumber(limit);
		assertIsNumber(used);
		return <InnerFilesQuota used={used} limit={limit} />;
	}, [limit, requestFailed, responseReceived, used]);
};
