/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { Text, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import useUserInfo from '../../../../hooks/useUserInfo';
import { SHARE_CHIP_SIZE } from '../../../constants';
import { Contact } from '../../../types/common';
import { getChipLabel, getChipTooltip } from '../../../utils/utils';

interface ShareChipLabelProps {
	contact: Contact | null | undefined;
	showTooltip?: boolean;
}

export const ShareChipLabel = ({
	contact,
	showTooltip = true
}: ShareChipLabelProps): JSX.Element => {
	const { me } = useUserInfo();
	const [t] = useTranslation();

	const chipLabel = useMemo(
		() => (me === contact?.id ? t('displayer.share.chip.you', 'You') : getChipLabel(contact)),
		[contact, me, t]
	);

	return (
		<Tooltip label={getChipTooltip(contact)} maxWidth="100%" disabled={!showTooltip}>
			<Text size={SHARE_CHIP_SIZE} weight="light">
				{chipLabel}
			</Text>
		</Tooltip>
	);
};
