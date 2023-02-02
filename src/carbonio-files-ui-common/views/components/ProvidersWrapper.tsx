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

export const ProvidersWrapper: React.FC = ({ children }) => {
	const apolloClient = useMemo(() => buildClient(), []);
	return (
		<StyledWrapper>
			<ApolloProvider client={apolloClient}>
				<SnackbarManager>
					<ModalManager>
						<PreviewManager>{children}</PreviewManager>
					</ModalManager>
				</SnackbarManager>
			</ApolloProvider>
		</StyledWrapper>
	);
};
