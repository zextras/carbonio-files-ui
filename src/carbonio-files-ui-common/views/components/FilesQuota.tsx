/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { Container, Icon, Quota, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { Text } from '../../design_system_fork/Text';
import { useFilesQuotaInfo } from '../../hooks/useFilesQuotaInfo';
import { humanFileSize } from '../../utils/utils';

function assertIsNumber(val: unknown): asserts val is number {
	if (typeof val !== 'number') {
		throw new Error('Not a number!');
	}
}

export function getPercentage(used: number, limit: number): number {
	return Math.min(100, Math.floor((used / limit) * 100));
}

const InnerFilesQuota = ({ used, limit }: { used: number; limit: number }): React.JSX.Element => {
	const [t] = useTranslation();

	const quotaString = useMemo(() => {
		if (limit === 0) {
			return t('quota.unlimitedSpace', '{{used}} of unlimited space', {
				replace: {
					used: humanFileSize(used)
				}
			});
		}
		return t('quota.limitedSpace', '{{used}} of {{limit}} used', {
			replace: {
				used: humanFileSize(used),
				limit: humanFileSize(limit)
			}
		});
	}, [limit, used, t]);

	const fillProp = useMemo(() => getPercentage(used, limit), [limit, used]);

	return (
		<Container
			data-testid="files-quota"
			crossAlignment={'flex-start'}
			height="fit"
			padding={{ vertical: '1rem', horizontal: '0.5rem' }}
			gap={'0.5rem'}
		>
			<Container orientation={'row'} mainAlignment={'flex-start'} gap={'0.5rem'}>
				<Text overflow={'break-word'}>{quotaString}</Text>
				{limit > 0 && fillProp >= 100 && (
					<Tooltip
						label={t(
							'quota.overQuota.tooltip.label',
							'You have reached the maximum quota available.'
						)}
					>
						<div>
							<Icon icon={'AlertCircle'} color={'error'} size={'large'} />
						</div>
					</Tooltip>
				)}
			</Container>
			{limit > 0 && <Quota fill={fillProp} fillBackground={fillProp < 100 ? 'info' : 'error'} />}
		</Container>
	);
};

export const FilesQuota = (): React.JSX.Element | null => {
	const { used, limit, responseReceived, requestFailed } = useFilesQuotaInfo();

	if (!responseReceived) {
		return null;
	}
	if (requestFailed) {
		return null;
	}
	assertIsNumber(limit);
	assertIsNumber(used);
	return <InnerFilesQuota used={used} limit={limit} />;
};
