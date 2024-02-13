/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import {
	NodeDetailsUserRow as CommonNodeDetailsUserRow,
	NodeDetailsUserRowProps as CommonNodeDetailsUserRowProps
} from '../carbonio-files-ui-common/views/components/NodeDetailsUserRow';
import {
	getComposePrefillMessageFunction,
	Participant,
	ParticipantRole
} from '../integrations/functions';

type NodeDetailsUserRowProps = Omit<CommonNodeDetailsUserRowProps, 'clickAction' | 'tooltip'>;

export const NodeDetailsUserRow: React.VFC<NodeDetailsUserRowProps> = ({
	user,
	label,
	dateTime,
	loading
}) => {
	const [t] = useTranslation();

	const tooltip = useMemo(
		() =>
			(user &&
				t('displayer.details.sendMailTo', 'Send e-mail to: {{email}}', {
					replace: { email: user.email }
				})) ||
			'',
		[t, user]
	);

	const { integratedFunction, available } = getComposePrefillMessageFunction();

	const openNewMailBoard = useCallback(() => {
		if (user && user.email) {
			const contact: Partial<Participant> = {
				type: ParticipantRole.TO,
				address: user.email
			};
			if (available) {
				integratedFunction({ recipients: [contact] });
			}
		}
	}, [available, integratedFunction, user]);

	return (
		<CommonNodeDetailsUserRow
			label={label}
			user={user}
			tooltip={tooltip}
			dateTime={dateTime}
			clickAction={openNewMailBoard}
			loading={loading}
		/>
	);
};
