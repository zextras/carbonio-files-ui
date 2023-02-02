/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { ApolloProvider, ReactiveVar } from '@apollo/client';
import { useModal } from '@zextras/carbonio-design-system';
import { size } from 'lodash';

import buildClient from '../../apollo';
import { DestinationVar, destinationVar } from '../../apollo/destinationVar';
import { NodeWithMetadata } from '../../types/common';
import { NodesSelectionModalContent } from '../../views/components/NodesSelectionModalContent';
import { useDestinationVarManager } from '../useDestinationVarManager';

export type OpenNodesSelectionModal = (
	args: Omit<React.ComponentPropsWithoutRef<typeof NodesSelectionModalContent>, 'closeAction'>
) => void;

const getDestinationVar = destinationVar as ReactiveVar<DestinationVar<NodeWithMetadata[]>>;

export function useNodesSelectionModal(): {
	openNodesSelectionModal: OpenNodesSelectionModal;
} {
	const createModal = useModal();
	const apolloClient = buildClient();

	const { resetAll, resetCurrent } = useDestinationVarManager<NodeWithMetadata[]>();

	const openModal = useCallback<OpenNodesSelectionModal>(
		(props) => {
			const closeModal = createModal(
				{
					minHeight: '25rem',
					maxHeight: '60vh',
					onClose: () => {
						resetAll();
						closeModal();
					},
					onClick: () => {
						if (props.maxSelection === 1 || size(getDestinationVar().currentValue) === 0) {
							if (props.canSelectOpenedFolder) {
								resetCurrent();
							} else if (size(getDestinationVar().currentValue) > 0) {
								resetAll();
							}
						}
					},
					children: (
						<ApolloProvider client={apolloClient}>
							<NodesSelectionModalContent
								closeAction={(): void => {
									resetAll();
									closeModal();
								}}
								{...props}
							/>
						</ApolloProvider>
					)
				},
				true
			);
		},
		[apolloClient, createModal, resetAll, resetCurrent]
	);

	return { openNodesSelectionModal: openModal };
}
