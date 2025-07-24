/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
	Button,
	Chip,
	ChipProps,
	Container,
	Icon,
	Row,
	Select,
	SelectItem,
	SingleSelectionOnChange,
	Text,
	Tooltip,
	useModal,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { find } from 'lodash';
import { useTranslation } from 'react-i18next';

import { CustomCollaborationLinkSelect } from './CustomCollaborationLinkSelect';
import { EMPTY_ITEM } from '../../../../../constants';
import {
	CreateCollaborationLinkType,
	useCreateCollaborationLinkMutation
} from '../../../../hooks/graphql/mutations/useCreateCollaborationLinkMutation';
import { useDeleteCollaborationLinksMutation } from '../../../../hooks/graphql/mutations/useDeleteCollaborationLinksMutation';
import { useGetCollaborationLinksQuery } from '../../../../hooks/graphql/queries/useGetCollaborationLinksQuery';
import { SharePermission } from '../../../../types/graphql/types';
import { copyToClipboard } from '../../../../utils/utils';
import { TextWithLineHeight } from '../../StyledComponents';

interface CollaborationLinksProps {
	nodeId: string;
	canWrite: boolean;
	nodeName: string;
}

export const CollaborationLinks = ({
	nodeId,
	canWrite,
	nodeName
}: CollaborationLinksProps): React.JSX.Element => {
	const [t] = useTranslation();
	const [selected, setSelected] = useState<SharePermission>();
	const createSnackbar = useSnackbar();
	const { createModal, closeModal } = useModal();

	const { data: getCollaborationLinksQueryData, loading } = useGetCollaborationLinksQuery(nodeId);

	const readOnlyCollaborationLink = useMemo(() => {
		if (getCollaborationLinksQueryData?.getCollaborationLinks) {
			return find(
				getCollaborationLinksQueryData?.getCollaborationLinks,
				(link) => link?.permission === SharePermission.ReadOnly
			);
		}
		return undefined;
	}, [getCollaborationLinksQueryData]);

	const readAndWriteCollaborationLink = useMemo(() => {
		if (getCollaborationLinksQueryData?.getCollaborationLinks) {
			return find(
				getCollaborationLinksQueryData?.getCollaborationLinks,
				(link) => link?.permission === SharePermission.ReadAndWrite
			);
		}
		return undefined;
	}, [getCollaborationLinksQueryData]);

	const readAndShareCollaborationLink = useMemo(() => {
		if (getCollaborationLinksQueryData?.getCollaborationLinks) {
			return find(
				getCollaborationLinksQueryData?.getCollaborationLinks,
				(link) => link?.permission === SharePermission.ReadAndShare
			);
		}
		return undefined;
	}, [getCollaborationLinksQueryData]);

	const readWriteAndShareCollaborationLink = useMemo(() => {
		if (getCollaborationLinksQueryData?.getCollaborationLinks) {
			return find(
				getCollaborationLinksQueryData?.getCollaborationLinks,
				(link) => link?.permission === SharePermission.ReadWriteAndShare
			);
		}
		return undefined;
	}, [getCollaborationLinksQueryData]);

	/** Mutation to create collaboration link */
	const { createCollaborationLink } = useCreateCollaborationLinkMutation(nodeId);

	/** Mutation to delete collaboration link */
	const deleteCollaborationsLinks = useDeleteCollaborationLinksMutation(nodeId);

	const copyLinkToClipboard = useCallback(
		(link: string) => {
			copyToClipboard(link).then(() => {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.collaborationLink.copyCollaborationLink', 'Collaboration link copied'),
					replace: true,
					hideButton: true
				});
			});
		},
		[createSnackbar, t]
	);

	const createCallback = useCallback(
		({ data }: Awaited<ReturnType<CreateCollaborationLinkType>>) => {
			if (data) {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t(
						'snackbar.collaborationLink.newCollaborationLinkGenerated.label',
						'New Collaboration link generated'
					),
					replace: true,
					onActionClick: () => {
						copyLinkToClipboard(data.createCollaborationLink.url);
					},
					actionLabel: t('snackbar.collaborationLink.actionLabel.copyLink', 'Copy link')
				});
			}
		},
		[copyLinkToClipboard, createSnackbar, t]
	);

	const createCollaborationLinkCallback = useCallback(
		(sharePermission?: SharePermission) => {
			sharePermission && createCollaborationLink(sharePermission).then(createCallback);
		},
		[createCallback, createCollaborationLink]
	);

	const onGenerateLink = useCallback(() => {
		createCollaborationLinkCallback(selected);
		setSelected(undefined);
	}, [createCollaborationLinkCallback, selected]);

	const copyCollaborationUrl = useCallback<NonNullable<ChipProps['onClick']>>(
		(event) => {
			if (event.target instanceof HTMLElement && event.target.textContent) {
				copyLinkToClipboard(event.target.textContent);
			}
		},
		[copyLinkToClipboard]
	);

	const openDeleteModal = useCallback(
		(linkId: string) => {
			const modalId = 'files-delete-collaboration-link-modal';
			createModal({
				id: modalId,
				title: t('modal.revokeCollaborationLink.header', 'Revoke {{nodeName}} collaboration link', {
					replace: { nodeName }
				}),
				confirmLabel: t('modal.revokeCollaborationLink.button.confirm', 'Revoke'),
				confirmColor: 'error',
				onConfirm: () => {
					deleteCollaborationsLinks([linkId]).then(({ data }) => {
						if (data) {
							closeModal(modalId);
						}
					});
				},
				showCloseIcon: true,
				onClose: () => {
					closeModal(modalId);
				},
				children: (
					<Container padding={{ vertical: 'large' }}>
						<Text overflow="break-word" size="small">
							{t(
								'modal.revokeCollaborationLink.body',
								'By revoking this link, you are blocking the possibility to create new shares with it. Everyone who has already used the collaboration link will keep the access to the item.',
								{
									replace: { nodeName }
								}
							)}
						</Text>
					</Container>
				)
			});
		},
		[closeModal, createModal, deleteCollaborationsLinks, nodeName, t]
	);

	const revokeCollaborationLink = useCallback(
		(id: string) => {
			openDeleteModal(id);
		},
		[openDeleteModal]
	);

	const isReadAndWriteItemDisabled = useMemo(
		() => !!readAndWriteCollaborationLink || !canWrite,
		[canWrite, readAndWriteCollaborationLink]
	);

	const readAndWriteTooltipLabel = useMemo(() => {
		if (!canWrite)
			return t(
				'collaborationLinks.permission.cannotWrite.tooltip',
				"You are not allowed to create this collaboration link because you don't have edit permission"
			);
		return t(
			'collaborationLinks.permission.optionDisabled.tooltip',
			'This type of link has already been created'
		);
	}, [canWrite, t]);

	const isReadWriteAndShareItemDisabled = useMemo(
		() => !!readWriteAndShareCollaborationLink || !canWrite,
		[canWrite, readWriteAndShareCollaborationLink]
	);

	const readAndWriteAndShareTooltipLabel = useMemo(() => {
		if (!canWrite)
			return t(
				'collaborationLinks.permission.cannotWrite.tooltip',
				"You are not allowed to create this collaboration link because you don't have edit permission"
			);

		return t(
			'collaborationLinks.permission.optionDisabled.tooltip',
			'This type of link has already been created'
		);
	}, [canWrite, t]);

	const items = useMemo<SelectItem<SharePermission>[]>(
		() => [
			{
				value: SharePermission.ReadOnly,
				label: t('collaborationLinks.permission.readOnly', 'View'),
				disabled: !!readOnlyCollaborationLink,
				customComponent: (
					<Tooltip
						disabled={!readOnlyCollaborationLink}
						label={t(
							'collaborationLinks.permission.optionDisabled.tooltip',
							'This type of link has already been created'
						)}
					>
						<Container mainAlignment="flex-start" orientation="horizontal">
							<Text color={readOnlyCollaborationLink ? 'secondary' : 'text'}>
								{t('collaborationLinks.permission.readOnly', 'View')}
							</Text>
						</Container>
					</Tooltip>
				)
			},
			{
				value: SharePermission.ReadAndWrite,
				label: t('collaborationLinks.permission.readAndWrite', 'Edit'),
				disabled: isReadAndWriteItemDisabled,
				customComponent: (
					<Tooltip disabled={!isReadAndWriteItemDisabled} label={readAndWriteTooltipLabel}>
						<Container mainAlignment="flex-start" orientation="horizontal">
							<Text color={isReadAndWriteItemDisabled ? 'secondary' : 'text'}>
								{t('collaborationLinks.permission.readAndWrite', 'Edit')}
							</Text>
						</Container>
					</Tooltip>
				)
			},
			{
				value: SharePermission.ReadAndShare,
				label: t('collaborationLinks.permission.readAndShare', 'View and manage sharing'),
				disabled: !!readAndShareCollaborationLink,
				customComponent: (
					<Tooltip
						disabled={!readAndShareCollaborationLink}
						label={t(
							'collaborationLinks.permission.optionDisabled.tooltip',
							'This type of link has already been created'
						)}
					>
						<Container mainAlignment="flex-start" orientation="horizontal">
							<Text color={readAndShareCollaborationLink ? 'secondary' : 'text'}>
								{t('collaborationLinks.permission.readAndShare', 'View and manage sharing')}
							</Text>
						</Container>
					</Tooltip>
				)
			},
			{
				value: SharePermission.ReadWriteAndShare,
				label: t('collaborationLinks.permission.readWriteAndShare', 'Edit and manage sharing'),
				disabled: isReadWriteAndShareItemDisabled,
				customComponent: (
					<Tooltip
						disabled={!isReadWriteAndShareItemDisabled}
						label={readAndWriteAndShareTooltipLabel}
					>
						<Container mainAlignment="flex-start" orientation="horizontal">
							<Text color={isReadWriteAndShareItemDisabled ? 'secondary' : 'text'}>
								{t('collaborationLinks.permission.readWriteAndShare', 'Edit and manage sharing')}
							</Text>
						</Container>
					</Tooltip>
				)
			}
		],
		[
			isReadAndWriteItemDisabled,
			isReadWriteAndShareItemDisabled,
			readAndShareCollaborationLink,
			readAndWriteAndShareTooltipLabel,
			readAndWriteTooltipLabel,
			readOnlyCollaborationLink,
			t
		]
	);

	const selection = useMemo(
		() => items.find((item) => item.value === selected) ?? EMPTY_ITEM,
		[selected, items]
	);

	const onSelectChange = useCallback<SingleSelectionOnChange>((id) => {
		setSelected(id as SharePermission);
	}, []);

	const isSelectDisabled = useMemo(
		() =>
			Boolean(
				readOnlyCollaborationLink &&
					readAndWriteCollaborationLink &&
					readAndShareCollaborationLink &&
					readWriteAndShareCollaborationLink
			),
		[
			readAndShareCollaborationLink,
			readAndWriteCollaborationLink,
			readOnlyCollaborationLink,
			readWriteAndShareCollaborationLink
		]
	);

	const collaborationLinks = useMemo(
		() => [
			{
				collaborationLink: readOnlyCollaborationLink,
				dataTestId: 'read-only-collaboration-link-container',
				title: t('collaborationLinks.permission.readOnly', 'View'),
				icons: ['EyeOutline']
			},
			{
				collaborationLink: readAndWriteCollaborationLink,
				dataTestId: 'read-write-collaboration-link-container',
				title: t('collaborationLinks.permission.readAndWrite', 'Edit'),
				icons: ['Edit2Outline']
			},
			{
				collaborationLink: readAndShareCollaborationLink,
				dataTestId: 'read-share-collaboration-link-container',
				title: t('collaborationLinks.permission.readAndShare', 'View and manage sharing'),
				icons: ['EyeOutline', 'ShareOutline']
			},
			{
				collaborationLink: readWriteAndShareCollaborationLink,
				dataTestId: 'read-write-share-collaboration-link-container',
				title: t('collaborationLinks.permission.readWriteAndShare', 'Edit and manage sharing'),
				icons: ['Edit2Outline', 'ShareOutline']
			}
		],
		[
			readAndShareCollaborationLink,
			readAndWriteCollaborationLink,
			readOnlyCollaborationLink,
			readWriteAndShareCollaborationLink,
			t
		]
	);

	const generateButtonTooltipLabel = useMemo(() => {
		if (isSelectDisabled) {
			return t(
				'collaborationLinks.maximumLinks.tooltip',
				"You've reached the maximum number of links. Revoke one to create a new one."
			);
		}
		if (!selected) {
			return t('collaborationLinks.button.choosePermission', 'Choose permissions to generate link');
		}
		return undefined;
	}, [isSelectDisabled, selected, t]);

	return (
		<Container
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			height="fit"
			padding={{ all: 'large' }}
			background={'gray6'}
			data-testid="collaboration-link-container"
			gap={'1rem'}
		>
			<Container
				mainAlignment="flex-start"
				crossAlignment="flex-start"
				height="fit"
				background={'gray6'}
			>
				<TextWithLineHeight size="medium">
					{t('collaborationLinks.title', 'Collaboration links')}
				</TextWithLineHeight>
				<TextWithLineHeight size="extrasmall" color="secondary" overflow="break-word">
					{t(
						'collaborationLinks.description',
						'Internal users will receive the permissions by opening the link. You can always modify granted permissions.'
					)}
				</TextWithLineHeight>
			</Container>
			{collaborationLinks.some(({ collaborationLink }) => collaborationLink) && (
				<Container mainAlignment="flex-start" crossAlignment="flex-start">
					{collaborationLinks.map(
						({ collaborationLink, dataTestId, title, icons }) =>
							collaborationLink && (
								<Container
									key={collaborationLink.id}
									orientation="horizontal"
									mainAlignment="flex-start"
									crossAlignment="flex-start"
									gap="0.5rem"
									padding={{ all: 'small' }}
									data-testid={dataTestId}
								>
									<Container
										crossAlignment="flex-start"
										width="auto"
										flexGrow={1}
										minWidth={0}
										gap={'0.25rem'}
									>
										<TextWithLineHeight size="small">{title}</TextWithLineHeight>
										<Chip
											label={
												<Tooltip
													label={t(
														'collaborationLinks.link.urlChip.tooltip.copy',
														'Copy Collaboration link'
													)}
													maxWidth="unset"
													placement="top"
												>
													<Row wrap="nowrap" minWidth={0} gap={'0.25rem'}>
														<Text size="small" weight="light">
															{collaborationLink.url}
														</Text>
														{icons.map((icon) => (
															<Icon key={icon} icon={icon} style={{ pointerEvents: 'none' }} />
														))}
													</Row>
												</Tooltip>
											}
											hasAvatar={false}
											minWidth={0}
											onClick={copyCollaborationUrl}
											maxWidth="100%"
										/>
									</Container>
									<Container
										width="auto"
										flexShrink={0}
										mainAlignment="flex-start"
										crossAlignment="flex-end"
									>
										<Button
											size="small"
											type="outlined"
											color="error"
											label={t('collaborationLinks.button.revoke', 'Revoke')}
											onClick={() => revokeCollaborationLink(collaborationLink.id)}
											icon={'SlashOutline'}
										/>
									</Container>
								</Container>
							)
					)}
				</Container>
			)}
			<Container mainAlignment={'flex-start'} crossAlignment="flex-start">
				<Select
					items={items}
					onChange={onSelectChange}
					label={t(
						'collaborationLinks.button.choosePermission',
						'Choose permissions to generate link'
					)}
					disabled={isSelectDisabled}
					LabelFactory={CustomCollaborationLinkSelect}
					selection={selection}
				/>
				<Container orientation="horizontal" mainAlignment="flex-end" padding={{ top: 'small' }}>
					<Tooltip label={generateButtonTooltipLabel} disabled={!!selected}>
						<Button
							label={t('collaborationLinks.button.generateLink', 'Generate link')}
							color="primary"
							onClick={onGenerateLink}
							type="outlined"
							size={'small'}
							disabled={isSelectDisabled || !selected || loading}
						/>
					</Tooltip>
				</Container>
			</Container>
		</Container>
	);
};
