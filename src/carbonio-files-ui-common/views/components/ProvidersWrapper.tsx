/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { ApolloProvider } from '@apollo/client';
import { ModalManager, SnackbarManager } from '@zextras/carbonio-design-system';
import { PreviewManager } from '@zextras/carbonio-ui-preview';

import StyledWrapper from '../../../StyledWrapper';
import buildClient from '../../apollo';

export const GlobalProvidersWrapper = ({
	children
}: {
	children?: React.ReactNode;
}): React.JSX.Element => {
	const apolloClient = useMemo(() => buildClient(), []);
	return (
		<StyledWrapper>
			<ApolloProvider client={apolloClient}>
				<PreviewManager>{children}</PreviewManager>
			</ApolloProvider>
		</StyledWrapper>
	);
};

// these providers need to be placed inside the routes, because they might need access to the current location info
export const ViewProvidersWrapper = ({
	children
}: {
	children?: React.ReactNode;
}): React.JSX.Element => (
	<SnackbarManager>
		<ModalManager>{children}</ModalManager>
	</SnackbarManager>
);
