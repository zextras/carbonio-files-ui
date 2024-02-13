/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getIntegratedFunction } from '@zextras/carbonio-shell-ui';

export const ParticipantRole = {
	FROM: 'f',
	TO: 't',
	CARBON_COPY: 'c',
	BLIND_CARBON_COPY: 'b',
	REPLY_TO: 'r',
	SENDER: 's',
	READ_RECEIPT_NOTIFICATION: 'n',
	RESENT_FROM: 'rf'
} as const;

type ParticipantRoleType = (typeof ParticipantRole)[keyof typeof ParticipantRole];

export type Participant = {
	type: ParticipantRoleType;
	address: string;
};

export type ComposePrefillMessageType = (args: {
	aid?: Array<string>;
	recipients?: Array<Partial<Participant>>;
}) => void;

export function getComposePrefillMessageFunction(): {
	integratedFunction: ComposePrefillMessageType;
	available: boolean;
} {
	const [integratedFunction, available] = getIntegratedFunction('composePrefillMessage');

	return {
		integratedFunction: integratedFunction as ComposePrefillMessageType,
		available
	};
}
