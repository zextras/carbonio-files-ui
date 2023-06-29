/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
	Container,
	Divider,
	Padding,
	Text,
	useModal,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { reduce, size } from 'lodash';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';

import { AddPublicLinkComponent } from './AddPublicLinkComponent';
import { PublicLinkComponent } from './PublicLinkComponent';
import useUserInfo from '../../../../../hooks/useUserInfo';
import { useCreateLinkMutation } from '../../../../hooks/graphql/mutations/useCreateLinkMutation';
import { useDeleteLinksMutation } from '../../../../hooks/graphql/mutations/useDeleteLinksMutation';
import { useUpdateLinkMutation } from '../../../../hooks/graphql/mutations/useUpdateLinkMutation';
import { useGetLinksQuery } from '../../../../hooks/graphql/queries/useGetLinksQuery';
import { PublicLinkRowStatus } from '../../../../types/common';
import { NonNullableListItem } from '../../../../types/utils';
import { copyToClipboard } from '../../../../utils/utils';

interface AddPublicLinkProps {
	nodeId: string;
	nodeName: string;
	canShare: boolean;
}

export const PublicLink = ({ nodeId, nodeName, canShare }: AddPublicLinkProps): JSX.Element => {
	const [t] = useTranslation();
	const { zimbraPrefTimeZoneId } = useUserInfo();
	const createSnackbar = useSnackbar();
	const createModal = useModal();

	const { data: getLinksQueryData } = useGetLinksQuery(nodeId);

	const links = useMemo(() => {
		if (getLinksQueryData?.getLinks) {
			return getLinksQueryData.getLinks;
		}
		return [];
	}, [getLinksQueryData]);

	const [addPublicLinkStatus, setAddPublicLinkStatus] = useState(PublicLinkRowStatus.CLOSED);
	const [openLinkId, setOpenLinkId] = useState<string | undefined>(undefined);
	const [thereIsOpenRow, setThereIsOpenRow] = useState(false);

	/** Mutation to create link */
	const { createLink, loading: createLinkLoading } = useCreateLinkMutation(nodeId);
	const deleteLinks = useDeleteLinksMutation(nodeId);
	const updateLink = useUpdateLinkMutation();

	/** AddPublicLinkComponent callbacks */
	const onAddLink = useCallback(() => {
		setAddPublicLinkStatus(PublicLinkRowStatus.OPEN);
		setThereIsOpenRow(true);
	}, []);

	const onAddUndo = useCallback(() => {
		setAddPublicLinkStatus(PublicLinkRowStatus.CLOSED);
		setThereIsOpenRow(false);
	}, []);

	const onGenerate = useCallback(
		(description?: string, expiresAt?: Date) => {
			let expiresWithOffset;
			if (expiresAt) {
				const minOffset = moment().tz(zimbraPrefTimeZoneId).utcOffset();
				expiresWithOffset = expiresAt.getTime() - minOffset * 60 * 1000;
			}
			setAddPublicLinkStatus(PublicLinkRowStatus.CLOSED);
			setThereIsOpenRow(false);
			return createLink(description, expiresWithOffset)
				.then(({ data }) => {
					if (data) {
						createSnackbar({
							key: new Date().toLocaleString(),
							type: 'info',
							label: t(
								'snackbar.publicLink.newPublicLinkGenerated.label',
								'New public Link generated'
							),
							replace: true,
							onActionClick: () => {
								copyToClipboard(data.createLink.url as string).then(() => {
									createSnackbar({
										key: new Date().toLocaleString(),
										type: 'info',
										label: t('snackbar.publicLink.copyLink', 'Public link copied'),
										replace: true,
										hideButton: true
									});
								});
							},
							actionLabel: t('snackbar.publicLink.actionLabel.copyLink', 'Copy Link')
						});
					}
				})
				.catch((reason) => {
					// reset to open to show populate fields which cause error
					setAddPublicLinkStatus(PublicLinkRowStatus.OPEN);
					setThereIsOpenRow(true);
					throw reason;
				});
		},
		[createLink, createSnackbar, t, zimbraPrefTimeZoneId]
	);

	/** PublicLinkComponent callbacks */
	const onEdit = useCallback((linkId: string) => {
		setOpenLinkId(linkId);
		setThereIsOpenRow(true);
	}, []);

	const onEditUndo = useCallback(() => {
		setOpenLinkId(undefined);
		setThereIsOpenRow(false);
	}, []);

	const onRevokeOrRemove = useCallback(
		(linkId: string, isRevoke: boolean) => {
			const closeModal = createModal({
				title: isRevoke
					? t('modal.revokeLink.header', 'Revoke {{nodeName}} public link', {
							replace: { nodeName }
					  })
					: t('modal.removeLink.header', 'Remove {{nodeName}} public link', {
							replace: { nodeName }
					  }),
				confirmLabel: isRevoke
					? t('modal.revokeLink.button.confirm', 'Revoke')
					: t('modal.removeLink.button.confirm', 'Remove'),
				confirmColor: 'error',
				onConfirm: () => {
					deleteLinks([linkId]);
					closeModal();
				},
				showCloseIcon: true,
				onClose: () => {
					closeModal();
				},
				children: (
					<Container padding={{ vertical: 'large' }}>
						<Text overflow="break-word" size="small">
							{isRevoke
								? t(
										'modal.revokeLink.body',
										'By revoking this link, you are blocking access to {{nodeName}} for anyone who tries to use the link to access the file',
										{
											replace: { nodeName }
										}
								  )
								: t(
										'modal.removeLink.body',
										"This link has expired, therefore it can't be used anymore to access the element. You can remove the link from the list or you can update its expiration date and other information in order to keep using it"
								  )}
						</Text>
					</Container>
				)
			});
		},
		[createModal, deleteLinks, nodeName, t]
	);

	const onEditConfirm = useCallback(
		(linkId: string, description?: string, expiresAt?: number) => {
			let expiresWithOffset;
			if (expiresAt) {
				const minOffset = moment().tz(zimbraPrefTimeZoneId).utcOffset();
				expiresWithOffset = expiresAt - minOffset * 60 * 1000;
			} else if (expiresAt === 0) {
				expiresWithOffset = expiresAt;
			}

			setOpenLinkId(undefined);
			setThereIsOpenRow(false);
			return updateLink(linkId, description, expiresWithOffset)
				.then(({ data }) => {
					if (data) {
						createSnackbar({
							key: new Date().toLocaleString(),
							type: 'info',
							label: t('snackbar.publicLink.linkUpdated.label', 'Public Link updated'),
							replace: true,
							onActionClick: () => {
								copyToClipboard(data.updateLink?.url as string).then(() => {
									createSnackbar({
										key: new Date().toLocaleString(),
										type: 'info',
										label: t('snackbar.publicLink.copyLink', 'Public link copied'),
										replace: true,
										hideButton: true
									});
								});
							},
							actionLabel: t('snackbar.publicLink.actionLabel.copyLink', 'Copy Link')
						});
					}
				})
				.catch((reason) => {
					setOpenLinkId(linkId);
					setThereIsOpenRow(true);
					throw reason;
				});
		},
		[createSnackbar, t, updateLink, zimbraPrefTimeZoneId]
	);

	const linkComponents = useMemo(() => {
		function getLinkStatus(linkId: string): PublicLinkRowStatus {
			if (openLinkId === linkId) {
				return PublicLinkRowStatus.OPEN;
			}
			return thereIsOpenRow ? PublicLinkRowStatus.DISABLED : PublicLinkRowStatus.CLOSED;
		}
		return reduce<NonNullableListItem<typeof links> | null | undefined, JSX.Element[]>(
			links,
			(accumulator, link) => {
				if (link) {
					accumulator.push(
						<PublicLinkComponent
							key={link.id}
							id={link.id}
							url={link.url}
							description={link.description}
							status={getLinkStatus(link.id)}
							expiresAt={link.expires_at}
							onEdit={onEdit}
							onEditConfirm={onEditConfirm}
							onUndo={onEditUndo}
							onRevokeOrRemove={onRevokeOrRemove}
							forceUrlCopyDisabled={thereIsOpenRow}
						/>
					);
				}
				return accumulator;
			},
			[]
		);
	}, [links, onEdit, onEditConfirm, onEditUndo, onRevokeOrRemove, openLinkId, thereIsOpenRow]);

	const addPublicLinkComputedStatus = useMemo<PublicLinkRowStatus>(() => {
		if (createLinkLoading) {
			return PublicLinkRowStatus.DISABLED;
		}
		if (addPublicLinkStatus === PublicLinkRowStatus.OPEN) {
			return PublicLinkRowStatus.OPEN;
		}
		return thereIsOpenRow ? PublicLinkRowStatus.DISABLED : PublicLinkRowStatus.CLOSED;
	}, [addPublicLinkStatus, createLinkLoading, thereIsOpenRow]);

	return (
		<Container
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			height="fit"
			padding={{ all: 'large' }}
			background={'gray6'}
		>
			{canShare && (
				<AddPublicLinkComponent
					status={addPublicLinkComputedStatus}
					onAddLink={onAddLink}
					onUndo={onAddUndo}
					onGenerate={onGenerate}
					limitReached={size(links) >= 50}
				/>
			)}
			{size(links) > 0 && addPublicLinkStatus === PublicLinkRowStatus.OPEN && (
				<>
					<Padding vertical="small" />
					<Divider color="gray2" />
				</>
			)}
			{canShare && linkComponents}
		</Container>
	);
};
