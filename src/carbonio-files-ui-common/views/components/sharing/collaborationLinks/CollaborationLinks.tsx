/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable no-nested-ternary */
import React, { useCallback, useMemo } from 'react';

import {
	Button,
	Chip,
	Container,
	Icon,
	Padding,
	Row,
	Text,
	Tooltip,
	useModal,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { find } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useCreateCollaborationLinkMutation } from '../../../../hooks/graphql/mutations/useCreateCollaborationLinkMutation';
import { useDeleteCollaborationLinksMutation } from '../../../../hooks/graphql/mutations/useDeleteCollaborationLinksMutation';
import { useGetNodeCollaborationLinksQuery } from '../../../../hooks/graphql/queries/useGetNodeCollaborationLinksQuery';
import { SharePermission } from '../../../../types/graphql/types';
import { copyToClipboard } from '../../../../utils/utils';
import { TextWithLineHeight } from '../../StyledComponents';

interface CollaborationLinksProps {
	nodeTypename: 'File' | 'Folder' | undefined;
	nodeId: string;
	canWrite: boolean;
	nodeName: string;
}

export const CollaborationLinks: React.FC<CollaborationLinksProps> = ({
	nodeId,
	nodeTypename,
	canWrite,
	nodeName
}) => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const createModal = useModal();

	const { data: getCollaborationLinksQueryData, loading } =
		useGetNodeCollaborationLinksQuery(nodeId);

	const readAndShareCollaborationLink = useMemo(() => {
		if (getCollaborationLinksQueryData?.getNode?.collaboration_links) {
			return find(
				getCollaborationLinksQueryData?.getNode?.collaboration_links,
				(link) => link?.permission === SharePermission.ReadAndShare
			);
		}
		return undefined;
	}, [getCollaborationLinksQueryData]);

	const readWriteAndShareCollaborationLink = useMemo(() => {
		if (getCollaborationLinksQueryData?.getNode?.collaboration_links) {
			return find(
				getCollaborationLinksQueryData?.getNode?.collaboration_links,
				(link) => link?.permission === SharePermission.ReadWriteAndShare
			);
		}
		return undefined;
	}, [getCollaborationLinksQueryData]);

	/** Mutation to create collaboration link */
	const { createCollaborationLink, loading: _createCollaborationLinkLoading } =
		useCreateCollaborationLinkMutation(nodeId);

	/** Mutation to delete collaboration link */
	const deleteCollaborationsLinks = useDeleteCollaborationLinksMutation({
		id: nodeId,
		__typename: nodeTypename
	});

	const copyLinkToClipboard = useCallback(
		(link: string) => {
			copyToClipboard(link).then(() => {
				createSnackbar({
					key: new Date().toLocaleString(),
					type: 'info',
					label: t('snackbar.collaborationLink.copyCollaborationLink', 'Collaboration link copied'),
					replace: true,
					hideButton: true
				});
			});
		},
		[createSnackbar, t]
	);

	const createCallback = useCallback(
		({ data }) => {
			if (data) {
				createSnackbar({
					key: new Date().toLocaleString(),
					type: 'info',
					label: t(
						'snackbar.collaborationLink.newCollaborationLinkGenerated.label',
						'New Collaboration Link generated'
					),
					replace: true,
					onActionClick: () => {
						copyLinkToClipboard(data.createCollaborationLink.url);
					},
					actionLabel: t('snackbar.collaborationLink.actionLabel.copyLink', 'Copy Link')
				});
			}
		},
		[copyLinkToClipboard, createSnackbar, t]
	);

	const createReadAndShareCollaborationLinkCallback = useCallback(() => {
		createCollaborationLink(SharePermission.ReadAndShare).then(createCallback);
	}, [createCallback, createCollaborationLink]);

	const createReadWriteAndShareCollaborationLinkCallback = useCallback(() => {
		createCollaborationLink(SharePermission.ReadWriteAndShare).then(createCallback);
	}, [createCallback, createCollaborationLink]);

	const copyCollaborationUrl = useCallback(
		(event) => {
			copyLinkToClipboard(event.target.textContent);
		},
		[copyLinkToClipboard]
	);

	const openDeleteModal = useCallback(
		(linkId: string) => {
			const closeModal = createModal({
				title: t('modal.revokeCollaborationLink.header', 'Revoke {{nodeName}} collaboration link', {
					replace: { nodeName }
				}),
				confirmLabel: t('modal.revokeCollaborationLink.button.confirm', 'Revoke'),
				confirmColor: 'error',
				onConfirm: () => {
					deleteCollaborationsLinks([linkId]).then(({ data }) => {
						if (data) {
							closeModal();
						}
					});
				},
				showCloseIcon: true,
				onClose: () => {
					closeModal();
				},
				children: (
					<Container padding={{ vertical: 'large' }}>
						<Text overflow="break-word" size="small">
							{t(
								'modal.revokeCollaborationLink.body',
								'By revoking this link, you are blocking the possibility to create new shares with it. Everyone who has already used the collaboration link will keep the access to the node.',
								{
									replace: { nodeName }
								}
							)}
						</Text>
					</Container>
				)
			});
		},
		[createModal, deleteCollaborationsLinks, nodeName, t]
	);

	const deleteReadAndShareCollaborationLinkCallback = useCallback(() => {
		if (readAndShareCollaborationLink) {
			openDeleteModal(readAndShareCollaborationLink.id);
		}
	}, [openDeleteModal, readAndShareCollaborationLink]);

	const deleteReadWriteAndShareCollaborationLinkCallback = useCallback(() => {
		if (readWriteAndShareCollaborationLink) {
			openDeleteModal(readWriteAndShareCollaborationLink.id);
		}
	}, [openDeleteModal, readWriteAndShareCollaborationLink]);

	return (
		<Container
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			height="fit"
			padding={{ all: 'large' }}
			background="gray6"
			data-testid="collaboration-link-container"
		>
			<Container
				mainAlignment="flex-start"
				crossAlignment="flex-start"
				height="fit"
				background="gray6"
			>
				<TextWithLineHeight size="medium">
					{t('collaborationLinks.title', 'Collaboration Links')}
				</TextWithLineHeight>
				<TextWithLineHeight size="extrasmall" color="secondary" overflow="break-word">
					{t(
						'collaborationLinks.description',
						'Internal users will receive the permissions by opening the link. You can always modify granted permissions.'
					)}
				</TextWithLineHeight>
			</Container>
			<Padding vertical="small" />
			<Container
				orientation="horizontal"
				mainAlignment="flex-start"
				crossAlignment="flex-start"
				gap="0.5rem"
				padding={{ all: 'small' }}
				data-testid="read-share-collaboration-link-container"
			>
				<Container
					width="auto"
					flexShrink={0}
					mainAlignment="flex-start"
					crossAlignment="flex-start"
				>
					<Icon icon="EyeOutline" size="medium" />
				</Container>
				<Container crossAlignment="flex-start" width="auto" flexGrow={1} minWidth={0}>
					<TextWithLineHeight size="small">
						{t('collaborationLinks.row.title.ReadAndShare', 'Read and Share')}
					</TextWithLineHeight>
					{readAndShareCollaborationLink ? (
						<Chip
							label={
								<Tooltip
									label={t(
										'collaborationLinks.link.urlChip.tooltip.copy',
										'Copy collaboration link'
									)}
									maxWidth="unset"
									placement="top"
								>
									<Row wrap="nowrap" minWidth={0}>
										<Text size="small" weight="light">
											{readAndShareCollaborationLink.url}
										</Text>
									</Row>
								</Tooltip>
							}
							hasAvatar={false}
							minWidth={0}
							onClick={copyCollaborationUrl}
							maxWidth="100%"
						/>
					) : (
						<TextWithLineHeight size="extrasmall" color="secondary">
							{t('collaborationLinks.row.placeholder', 'Create a link in order to share the node')}
						</TextWithLineHeight>
					)}
				</Container>
				<Container width="auto" flexShrink={0} mainAlignment="flex-start" crossAlignment="flex-end">
					{readAndShareCollaborationLink ? (
						<Button
							size="small"
							type="outlined"
							color="error"
							label={t('collaborationLinks.button.revoke', 'Revoke')}
							onClick={deleteReadAndShareCollaborationLinkCallback}
							icon={'SlashOutline'}
						/>
					) : (
						<Button
							size="small"
							type="outlined"
							label={t('collaborationLinks.button.generateLink', 'Generate Link')}
							onClick={createReadAndShareCollaborationLinkCallback}
							disabled={loading}
						/>
					)}
				</Container>
			</Container>
			<Padding vertical="extrasmall" />
			{canWrite && (
				<Container
					orientation="horizontal"
					mainAlignment="flex-start"
					crossAlignment="flex-start"
					gap="0.5rem"
					padding={{ all: 'small' }}
					data-testid="read-write-share-collaboration-link-container"
				>
					<Container
						width="auto"
						flexShrink={0}
						mainAlignment="flex-start"
						crossAlignment="flex-start"
					>
						<Icon icon="Edit2Outline" size="medium" />
					</Container>
					<Container crossAlignment="flex-start" width="auto" flexGrow={1} minWidth={0}>
						<TextWithLineHeight size="small">
							{t('collaborationLinks.row.title.writeAndShare', 'Write and Share')}
						</TextWithLineHeight>
						{readWriteAndShareCollaborationLink ? (
							<Chip
								label={
									<Tooltip
										label={t(
											'collaborationLinks.link.urlChip.tooltip.copy',
											'Copy collaboration link'
										)}
										maxWidth="unset"
										placement="top"
									>
										<Row wrap="nowrap" minWidth={0}>
											<Text size="small" weight="light">
												{readWriteAndShareCollaborationLink.url}
											</Text>
										</Row>
									</Tooltip>
								}
								hasAvatar={false}
								minWidth={0}
								onClick={copyCollaborationUrl}
								maxWidth="100%"
							/>
						) : (
							<TextWithLineHeight size="extrasmall" color="secondary">
								{t(
									'collaborationLinks.row.placeholder',
									'Create a link in order to share the node'
								)}
							</TextWithLineHeight>
						)}
					</Container>
					<Container
						width="auto"
						flexShrink={0}
						mainAlignment="flex-start"
						crossAlignment="flex-end"
					>
						{readWriteAndShareCollaborationLink ? (
							<Button
								size="small"
								type="outlined"
								color="error"
								label={t('collaborationLinks.button.revoke', 'Revoke')}
								onClick={deleteReadWriteAndShareCollaborationLinkCallback}
								icon={'SlashOutline'}
							/>
						) : (
							<Button
								size="small"
								type="outlined"
								label={t('collaborationLinks.button.generateLink', 'Generate Link')}
								onClick={createReadWriteAndShareCollaborationLinkCallback}
								disabled={loading}
							/>
						)}
					</Container>
				</Container>
			)}
		</Container>
	);
};
