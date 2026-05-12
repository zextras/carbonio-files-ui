/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApolloError, useApolloClient } from '@apollo/client';
import {
	ChipInputProps,
	ChipItem,
	Divider,
	ModalFooter,
	ModalHeader,
	Padding,
	Text,
	Tooltip,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { forEach } from 'lodash';
import { Trans, useTranslation } from 'react-i18next';

import { AccountChipInput } from './AccountChipInput';
import { CustomModalBody, InlineText } from './StyledComponents';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { useTracker } from '../../../hooks/useTracker';
import { FILES_APP_ID, TRACKER_EVENT } from '../../constants';
import PARENT_ID from '../../graphql/fragments/parentId.graphql';
import { useGetTransferOwnershipAvailabilityQuery } from '../../hooks/graphql/queries/useGetTransferOwnershipAvailabilityQuery';
import { useUpdateFolderContent } from '../../hooks/graphql/useUpdateFolderContent';
import { createOnQueryUpdated } from '../../hooks/graphql/utils';
import {
	TransferOwnershipDocument,
	Folder,
	ParentIdFragment,
	QueryGetPathArgs
} from '../../types/graphql/types';
import { ContactInfo } from '../../types/network';

interface TransferOwnershipModalContentProps {
	closeAction: () => void;
	nodes: Array<{ id: string }>;
}

export const TransferOwnershipModalContent = ({
	closeAction,
	nodes
}: TransferOwnershipModalContentProps): React.JSX.Element => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const apolloClient = useApolloClient();
	const { capture } = useTracker();

	const { activeNodeId, removeActiveNode } = useActiveNode();

	const onQueryUpdated = useMemo(
		() => createOnQueryUpdated(activeNodeId, removeActiveNode),
		[activeNodeId, removeActiveNode]
	);

	const { removeNodesFromFolder } = useUpdateFolderContent();

	const [newOwnerValue, setNewOwnerValue] = useState<Array<ChipItem<string>>>([]);
	const chipInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		chipInputRef.current?.focus();
	}, []);

	const { data, loading, error } = useGetTransferOwnershipAvailabilityQuery(
		nodes,
		newOwnerValue[0]?.value
	);

	const transferOwnership = useCallback(
		(userId: string) =>
			apolloClient.mutate({
				mutation: TransferOwnershipDocument,
				variables: {
					node_ids: nodes.map((node) => node.id),
					user_id: userId
				},
				update(cache, { data: updateDate }) {
					if (updateDate?.transferOwnership) {
						const parents: Record<string, Pick<Folder, 'id' | '__typename'>> = {};
						const nodesByParent: Record<string, string[]> = {};
						forEach(nodes, (node) => {
							const parentFolder = cache.readFragment<ParentIdFragment>({
								id: cache.identify(node),
								fragment: PARENT_ID
							});

							if (parentFolder?.parent) {
								const { parent } = parentFolder;
								if (parent.id in parents) {
									nodesByParent[parent.id].push(node.id);
								} else {
									parents[parent.id] = parent as Pick<Folder, '__typename' | 'id'>;
									nodesByParent[parent.id] = [node.id];
								}
							}

							const getPathArgs: QueryGetPathArgs = { node_id: node.id };
							cache.evict({
								fieldName: 'getPath',
								args: getPathArgs
							});
							cache.gc();
						});
						forEach(nodesByParent, (nodeIds, parentId) => {
							removeNodesFromFolder(parents[parentId], nodeIds);
						});
					}
				},
				onQueryUpdated,
				fetchPolicy: 'network-only'
			}),
		[apolloClient, nodes, onQueryUpdated, removeNodesFromFolder]
	);

	const titleLabel = useMemo(
		() =>
			t('modal.transferOwnership.title', {
				defaultValue_one: 'Transfer Ownership of {{node.name}}',
				defaultValue_other: 'Transfer Ownership of {{count}} items',
				count: nodes.length,
				replace: { node: nodes.length === 1 && nodes[0], count: nodes.length }
			}),
		[nodes, t]
	);

	const title = useMemo(
		() => (
			<Tooltip label={titleLabel} overflowTooltip>
				<Text weight={'bold'}>{titleLabel}</Text>
			</Tooltip>
		),
		[titleLabel]
	);

	const confirmHandler = useCallback(
		(e: Event | React.SyntheticEvent) => {
			e.stopPropagation();
			if (newOwnerValue.length === 0 || !newOwnerValue[0].value) {
				return;
			}
			transferOwnership(newOwnerValue[0].value)
				.then((result) => {
					if (result.data?.transferOwnership) {
						capture(TRACKER_EVENT.transferOwnership, { app: FILES_APP_ID, success: true });
						createSnackbar({
							actionLabel: t('snackbar.transferOwnership.actionLabel', 'Ok'),
							key: `${result.data?.transferOwnership.id}-transferOwnership`,
							severity: 'success',
							label: (
								<>
									<Text color="gray6" size="medium" overflow={'break-word'}>
										{t(
											'snackbar.transferOwnership.success1',
											'Ownership transferred successfully.'
										)}
									</Text>
									<Text color="gray6" size="medium" overflow={'break-word'}>
										{t(
											'snackbar.transferOwnership.success2',
											'The items are now in your "Shared with me" folder.'
										)}
									</Text>
								</>
							),
							replace: true
						});
					} else {
						console.error('Failed to transfer ownership');
					}
				})
				.catch((err) => {
					capture(TRACKER_EVENT.transferOwnership, { app: FILES_APP_ID, success: false });
					if (err instanceof ApolloError) {
						const isOverQuotaError = err.graphQLErrors.some(
							(gErr) => gErr.extensions?.errorCode === 'OVER_QUOTA_REACHED'
						);
						if (isOverQuotaError) {
							createSnackbar({
								actionLabel: t('snackbar.transferOwnership.actionLabel', 'Ok'),
								key: 'transferOwnership-overQuota',
								severity: 'error',
								label: (
									<>
										<Text color="gray6" size="medium" overflow={'break-word'}>
											{t(
												'snackbar.transferOwnership.error.overQuota',
												'Ownership transfer failed.'
											)}
										</Text>
										<Text color="gray6" size="medium" overflow={'break-word'}>
											{t(
												'snackbar.transferOwnership.error.overQuota2',
												'The new owner doesn’t have enough storage available.'
											)}
										</Text>
									</>
								),
								replace: true
							});
							return;
						}
					}
					createSnackbar({
						key: 'transferOwnership-error',
						severity: 'error',
						label: (
							<>
								<Text color="gray6" size="medium" overflow={'break-word'}>
									{t(
										'snackbar.transferOwnership.error.generic',
										'Something went wrong while transferring ownership.'
									)}
								</Text>
								<Text color="gray6" size="medium" overflow={'break-word'}>
									{t('snackbar.transferOwnership.error.generic2', 'Please try again.')}
								</Text>
							</>
						),
						replace: true
					});
				})
				.finally(() => {
					closeAction();
				});
		},
		[capture, closeAction, createSnackbar, newOwnerValue, t, transferOwnership]
	);

	const chipInputOnChange = useCallback<NonNullable<ChipInputProps['onChange']>>((newOwner) => {
		if (newOwner.length > 0) {
			setNewOwnerValue([
				{
					label: newOwner[0].label,
					value: (newOwner[0] as ContactInfo)._attrs.zimbraId || undefined,
					onClick: (event): void => {
						event.stopPropagation();
					},
					background: 'gray2'
				}
			]);
		} else {
			setNewOwnerValue([]);
		}
	}, []);

	const inputDescription = useMemo(() => {
		if (newOwnerValue.length === 0) {
			return undefined;
		}
		if (loading) {
			return t('transferOwnership.modal.loading', 'Checking the new owner’s storage quota...');
		}
		if (error) {
			return t('transferOwnership.modal.error', 'An error occurred while fetching data.');
		}
		if (data?.getTransferOwnershipAvailability === false) {
			return t(
				'transferOwnership.modal.unavailable',
				'The new owner doesn’t have enough storage available.'
			);
		}
		return t('transferOwnership.modal.available', 'The new owner has enough storage available.');
	}, [data?.getTransferOwnershipAvailability, error, loading, newOwnerValue.length, t]);

	const confirmTooltip = useMemo(() => {
		if (loading) {
			return t(
				'transferOwnership.modal.loadingTooltip',
				'Checking the new owner’s storage quota...'
			);
		}
		if (data?.getTransferOwnershipAvailability === false) {
			return t(
				'transferOwnership.modal.unavailableTooltip',
				'The new owner doesn’t have enough storage available.'
			);
		}
		return undefined;
	}, [data?.getTransferOwnershipAvailability, loading, t]);

	return (
		<>
			<ModalHeader
				title={title}
				onClose={closeAction}
				showCloseIcon
				closeIconTooltip={t('modal.close.tooltip', 'Close')}
			/>
			<Divider />
			<CustomModalBody>
				<Text>
					{t('transferOwnership.modal.description', 'Select a new owner for the selected items.')}
				</Text>
				<Padding vertical={'large'} width={'auto'}>
					<AccountChipInput
						inputRef={chipInputRef}
						placeholder={`${t('transferOwnership.modal.placeholder', 'Select a new owner')}*`}
						onChange={chipInputOnChange}
						value={newOwnerValue}
						description={inputDescription}
						hasError={data?.getTransferOwnershipAvailability === false}
					/>
				</Padding>
				<Text>{t('transferOwnership.modal.note', 'After the transfer:')}</Text>
				<ul>
					<li>
						<Text overflow={'break-word'}>
							<Trans
								t={t}
								i18nKey="transferOwnership.modal.note1"
								defaults="You’ll remain as a <bold>collaborator with editing and sharing rights.</bold>"
								components={{
									bold: <InlineText overflow={'break-word'} weight="bold" />
								}}
							/>
						</Text>
					</li>
					<li>
						<Text overflow={'break-word'}>
							{t('transferOwnership.modal.note2', 'All sharing settings will be kept.')}
						</Text>
					</li>
					<li>
						<Text overflow={'break-word'}>
							<Trans
								t={t}
								i18nKey="transferOwnership.modal.note3"
								defaults="The new owner <bold>will be notified.</bold>"
								components={{
									bold: <InlineText overflow={'break-word'} weight="bold" />
								}}
							/>
						</Text>
					</li>
				</ul>
				<Text weight={'bold'} overflow={'break-word'}>
					{t('transferOwnership.modal.note4', 'Please note:')}
				</Text>
				<ul>
					<li>
						<Text overflow={'break-word'}>
							{t(
								'transferOwnership.modal.note5',
								'If the new owner exceeds their storage quota, the transfer will fail.'
							)}
						</Text>
					</li>
					<li>
						<Text overflow={'break-word'}>
							{t('transferOwnership.modal.note6', 'This action is permanent and cannot be undone.')}
						</Text>
					</li>
				</ul>
			</CustomModalBody>
			<Divider />
			<ModalFooter
				confirmLabel={t('transferOwnership.modal.button.confirm', 'Transfer')}
				onConfirm={confirmHandler}
				confirmDisabled={
					newOwnerValue.length === 0 ||
					!newOwnerValue[0].value ||
					data?.getTransferOwnershipAvailability !== true
				}
				confirmTooltip={confirmTooltip}
				secondaryActionLabel={t('modal.cancel.label', 'Cancel')}
				onSecondaryAction={closeAction}
			/>
		</>
	);
};
