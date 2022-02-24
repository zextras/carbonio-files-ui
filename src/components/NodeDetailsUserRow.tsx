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
import { Contact, getMailToAction } from '../integrations/actions';

type NodeDetailsUserRowProps = Omit<CommonNodeDetailsUserRowProps, 'clickAction' | 'tooltip'>;

export const NodeDetailsUserRow: React.VFC<NodeDetailsUserRowProps> = ({
	user,
	label,
	dateTime
}) => {
	const [t] = useTranslation();

	const tooltip = useMemo(
		() =>
			t('displayer.details.sendMailTo', 'Send e-mail to: {{email}}', {
				replace: { email: user.email }
			}),
		[t, user.email]
	);

	const openNewMailBoard = useCallback<React.MouseEventHandler>(
		(event) => {
			if (user && user.email) {
				const contact: Contact = {
					address: user.email,
					email: {
						email: {
							mail: user.email
						}
					},
					firstName: user.full_name || user.email,
					middleName: ''
				};
				const { action, available } = getMailToAction(contact);
				if (available && action) {
					action.click(event);
				}
			}
		},
		[user]
	);

	return (
		<CommonNodeDetailsUserRow
			label={label}
			user={user}
			tooltip={tooltip}
			dateTime={dateTime}
			clickAction={openNewMailBoard}
		/>
	);
};
