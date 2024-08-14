/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { Container, Icon, Quota, Tooltip, Text, Button } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

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

const CustomText = styled(Text)`
	margin-right: auto;
	margin-left: 0;
`;

const InnerFilesQuota = ({
	used,
	limit,
	refreshData
}: {
	used: number;
	limit: number;
	refreshData: () => void;
}): React.JSX.Element => {
	const [t] = useTranslation();

	const quotaString = useMemo(() => {
		if (limit === 0) {
			return t('quota.unlimitedSpace', '{{used}} of unlimited space', {
				replace: {
					used: humanFileSize(used, t)
				}
			});
		}
		return t('quota.limitedSpace', '{{used}} of {{limit}} used', {
			replace: {
				used: humanFileSize(used, t),
				limit: humanFileSize(limit, t)
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
			<Container orientation={'row'} mainAlignment={'flex-end'} gap={'0.5rem'}>
				<CustomText overflow={'break-word'} lineHeight={1}>
					{quotaString}
				</CustomText>
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
				<Tooltip label={t('quota.refresh.tooltip.label', 'Refresh')}>
					<Button
						icon={'Refresh'}
						size={'large'}
						type={'ghost'}
						color={'text'}
						onClick={refreshData}
					/>
				</Tooltip>
			</Container>
			{limit > 0 && <Quota fill={fillProp} fillBackground={fillProp < 100 ? 'info' : 'error'} />}
		</Container>
	);
};

export const FilesQuota = (): React.JSX.Element | null => {
	const { used, limit, responseReceived, requestFailed, refreshData } = useFilesQuotaInfo();

	if (!responseReceived) {
		return null;
	}
	if (requestFailed) {
		return null;
	}
	assertIsNumber(limit);
	assertIsNumber(used);
	return <InnerFilesQuota used={used} limit={limit} refreshData={refreshData} />;
};
