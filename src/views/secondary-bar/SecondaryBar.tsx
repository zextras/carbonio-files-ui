/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useEffect, useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Accordion, AccordionItemType, Container } from '@zextras/carbonio-design-system';
import { map, find, reduce, size, orderBy, filter, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { secondaryBarItemVar } from '../../carbonio-files-ui-common/apollo/secondaryBarItemVar';
import { uploadVar } from '../../carbonio-files-ui-common/apollo/uploadVar';
import { INTERNAL_PATH, FILTER_TYPE, ROOTS } from '../../carbonio-files-ui-common/constants';
import { useGetRootsListQuery } from '../../carbonio-files-ui-common/hooks/graphql/queries/useGetRootsListQuery';
import { UploadStatus } from '../../carbonio-files-ui-common/types/graphql/client-types';
import { GetRootsListQuery } from '../../carbonio-files-ui-common/types/graphql/types';
import {
	SecondaryBarItemExpanded,
	SecondaryBarItemNotExpanded
} from '../../carbonio-files-ui-common/views/components/SecondaryBarItem';
import { useNavigation } from '../../hooks/useNavigation';

type AccordionItemWithPriority = AccordionItemType & {
	priority?: number;
	completeTotalBadgeCounter?: string;
	isUploadFailed?: boolean;
};

const CustomAccordion = styled(Accordion)`
	justify-content: flex-start;
	height: 100%;
`;

interface SecondaryBarProps {
	expanded: boolean;
}

export const SecondaryBar = ({ expanded }: SecondaryBarProps): JSX.Element => {
	const { navigateTo } = useNavigation();
	const [t] = useTranslation();
	const { data } = useGetRootsListQuery();
	const uploadStatus = useReactiveVar(uploadVar);

	const [forceTrashOpen, setForceTrashOpen] = useState(false);
	const location = useLocation();

	useEffect(() => {
		const item = secondaryBarItemVar();
		if (expanded && item === 'trash') {
			setForceTrashOpen(true);
			// used this workaround because when 'expanded' prop changes the component was remounted
			secondaryBarItemVar('');
		} else if (expanded && item === 'filter') {
			secondaryBarItemVar('');
		}
	}, [expanded]);

	const uploadsInfo = useMemo(
		() => ({
			isUploading: find(uploadStatus, (item) => item.status === UploadStatus.LOADING) !== undefined,
			uploadsCounter: size(uploadStatus),
			uploadsCompletedCounter: filter(
				uploadStatus,
				(item) => item.status === UploadStatus.COMPLETED
			).length,
			isFailed: some(uploadStatus, (item) => item.status === UploadStatus.FAILED)
		}),
		[uploadStatus]
	);

	const items = useMemo<AccordionItemType[]>(() => {
		const filters: AccordionItemWithPriority[] = [
			{
				id: 'Recents',
				priority: 1,
				icon: 'ClockOutline',
				label: t('secondaryBar.filtersList.recents', 'Recents'),
				onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
					ev.stopPropagation();
					navigateTo(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.recents}`);
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.recents}`)
			},
			{
				id: 'Flagged',
				priority: 2,
				icon: 'FlagOutline',
				iconColor: 'error',
				label: t('secondaryBar.filtersList.flagged', 'Flagged'),
				onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
					ev.stopPropagation();
					navigateTo(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`);
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`)
			},
			{
				id: 'SharedWithMe',
				priority: 3,
				icon: 'ArrowCircleLeftOutline',
				iconColor: 'linked',
				label: t('secondaryBar.filtersList.sharedWithMe', 'Shared with me'),
				onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
					ev.stopPropagation();
					navigateTo(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`);
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`)
			},
			{
				id: 'SharedByMe',
				priority: 4,
				icon: 'ArrowCircleRightOutline',
				iconColor: 'warning',
				label: t('secondaryBar.filtersList.sharedByMe', 'Shared by me'),
				onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
					ev.stopPropagation();
					navigateTo(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedByMe}`);
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedByMe}`)
			}
		];

		const uploads: AccordionItemWithPriority = {
			id: 'Uploads',
			priority: 5,
			label: t('secondaryBar.uploads', 'Uploads'),
			icon: !uploadsInfo.isUploading ? 'CloudUploadOutline' : 'AnimatedUpload',
			onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
				ev.stopPropagation();
				navigateTo(INTERNAL_PATH.UPLOADS);
			},
			badgeType: 'unread',
			completeTotalBadgeCounter:
				(uploadsInfo.uploadsCounter > 0 &&
					`${uploadsInfo.uploadsCompletedCounter}/${uploadsInfo.uploadsCounter}`) ||
				undefined,
			isUploadFailed: uploadsInfo.isFailed,
			CustomComponent: SecondaryBarItemExpanded,
			active: location.pathname.includes(INTERNAL_PATH.UPLOADS)
		};

		const trashItems: AccordionItemWithPriority[] = [
			{
				id: ROOTS.TRASH_MY_ELEMENTS,
				label: t('secondaryBar.filtersList.myElements', 'My elements'),
				icon: 'HardDriveOutline',
				onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
					ev.stopPropagation();
					navigateTo(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`);
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`)
			},
			{
				id: ROOTS.TRASH_SHARED_ELEMENTS,
				label: t('secondaryBar.filtersList.sharedElements', 'Shared elements'),
				icon: 'ShareOutline',
				onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
					ev.stopPropagation();
					navigateTo(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedTrash}`);
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes(`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedTrash}`)
			}
		];

		const fallbackRoots: GetRootsListQuery['getRootsList'] = [
			{ id: ROOTS.LOCAL_ROOT, name: ROOTS.LOCAL_ROOT },
			{ id: ROOTS.TRASH, name: ROOTS.TRASH }
		];

		const rootItems = reduce<
			GetRootsListQuery['getRootsList'][number],
			AccordionItemWithPriority[]
		>(
			data?.getRootsList || fallbackRoots,
			(acc, root, idx) => {
				if (root) {
					switch (root.id) {
						case ROOTS.LOCAL_ROOT: {
							acc.push({
								priority: 0,
								id: root.id,
								label: t('secondaryBar.filesHome', 'Home'),
								icon: 'FolderOutline',
								onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
									ev.stopPropagation();
									navigateTo(`${INTERNAL_PATH.ROOT}/${root.id}`);
								},
								CustomComponent: SecondaryBarItemExpanded,
								active:
									location.pathname.includes(`${INTERNAL_PATH.ROOT}/${root.id}`) ||
									location.search.includes(`folder=${root.id}`)
							});
							break;
						}
						case ROOTS.TRASH: {
							acc.push({
								open: forceTrashOpen,
								id: root.id,
								priority: 6,
								icon: 'Trash2Outline',
								label: t('secondaryBar.filtersList.trash', 'Trash'),
								onClick: (): void => {
									if (!expanded) {
										secondaryBarItemVar('trash');
									}
								},
								items: trashItems,
								CustomComponent: SecondaryBarItemExpanded
							});
							break;
						}
						default: {
							acc.push({
								priority: idx + 4,
								id: root.id,
								label: root.name,
								onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
									ev.stopPropagation();
									navigateTo(`${INTERNAL_PATH.ROOT}/${root.id}`);
								},
								CustomComponent: SecondaryBarItemExpanded,
								active:
									location.pathname.includes(`${INTERNAL_PATH.ROOT}/${root.id}`) ||
									location.search.includes(`folder=${root.id}`)
							});
							break;
						}
					}
				}
				return acc;
			},
			[]
		);

		return orderBy([...rootItems, ...filters, uploads], ['priority'], ['asc']);
	}, [t, uploadsInfo, data, forceTrashOpen, navigateTo, expanded, location]);

	return (
		<Container height="fit">
			{expanded ? (
				<CustomAccordion role="menuitem" items={items || []} />
			) : (
				map(
					items,
					(value, index) => value && <SecondaryBarItemNotExpanded key={index} item={value} />
				)
			)}
		</Container>
	);
};
