/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useEffect, useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Accordion, Container } from '@zextras/carbonio-design-system';
import find from 'lodash/find';
import map from 'lodash/map';
import orderBy from 'lodash/orderBy';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { secondaryBarItemVar } from '../../carbonio-files-ui-common/apollo/secondaryBarItemVar';
import { uploadVar } from '../../carbonio-files-ui-common/apollo/uploadVar';
import { ROOTS } from '../../carbonio-files-ui-common/constants';
import { useGetRootsListQuery } from '../../carbonio-files-ui-common/hooks/graphql/queries/useGetRootsListQuery';
import { UploadStatus } from '../../carbonio-files-ui-common/types/common';
import {
	AccordionItemShape,
	SecondaryBarItemExpanded,
	SecondaryBarItemNotExpanded
} from '../../carbonio-files-ui-common/views/components/SecondaryBarItem';
import { useNavigation } from '../../hooks/useNavigation';

const CustomAccordion = styled(Accordion)`
	justify-content: flex-start;
	height: 100%;
	div[class*='AccordionContainer'] {
		& > div:only-child div[class*='CustomAccordionItem'],
		& > div[class*='Padding'] {
			padding-right: 16px;
		}
	}
`;

interface ShellSecondaryBarProps {
	expanded: boolean;
}

export const ShellSecondaryBar: React.VFC<ShellSecondaryBarProps> = ({ expanded }) => {
	const { navigateTo } = useNavigation();
	const [t] = useTranslation();
	const { data } = useGetRootsListQuery();
	const uploadStatus = useReactiveVar(uploadVar);

	const [forceTrashOpen, setForceTrashOpen] = useState(false);
	const [forceFilterOpen, setForceFilterOpen] = useState(false);
	const location = useLocation();

	useEffect(() => {
		const item = secondaryBarItemVar();
		if (expanded && item === 'trash') {
			setForceTrashOpen(true);
			// used this workaround because when 'expanded' prop changes the component was remounted
			secondaryBarItemVar('');
		} else if (expanded && item === 'filter') {
			setForceFilterOpen(true);
			secondaryBarItemVar('');
		}
	}, [expanded]);

	const uploadsInfo = useMemo(
		() => ({
			isUploading: find(uploadStatus, (item) => item.status === UploadStatus.LOADING) !== undefined,
			uploadsCounter: uploadStatus.length
		}),
		[uploadStatus]
	);

	const items = useMemo<Array<AccordionItemShape | null | undefined>>(() => {
		const filtersAsRoots: AccordionItemShape[] = [
			{
				id: 'SharedWithMe',
				priority: 1,
				icon: 'ShareOutline',
				label: t('secondaryBar.filtersList.sharedWithMe', 'Shared with me'),
				onClick: (ev: React.SyntheticEvent): void => {
					ev.stopPropagation();
					navigateTo('/filter/sharedWithMe');
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes('/filter/sharedWithMe')
			}
		];

		const filters: AccordionItemShape = {
			id: 'FILTERS',
			onClick: (): void => {
				if (!expanded) {
					secondaryBarItemVar('filter');
				}
			},
			open: forceFilterOpen,
			label: t('secondaryBar.filters', 'Filters'),
			icon: 'FunnelOutline',
			items: [
				{
					id: 'Flagged',
					label: t('secondaryBar.filtersList.flagged', 'Flagged'),
					onClick: (ev: React.SyntheticEvent): void => {
						ev.stopPropagation();
						navigateTo('/filter/flagged');
					},
					CustomComponent: SecondaryBarItemExpanded,
					active: location.pathname.includes('/filter/flagged')
				},
				{
					id: 'SharedByMe',
					label: t('secondaryBar.filtersList.sharedByMe', 'Shared by me'),
					onClick: (ev: React.SyntheticEvent): void => {
						ev.stopPropagation();
						navigateTo('/filter/sharedByMe');
					},
					CustomComponent: SecondaryBarItemExpanded,
					active: location.pathname.includes('/filter/sharedByMe')
				}
			],
			CustomComponent: SecondaryBarItemExpanded
		};

		const uploads: AccordionItemShape = {
			id: 'Uploads',
			label: t('secondaryBar.uploads', 'Uploads'),
			icon: !uploadsInfo.isUploading ? 'CloudUploadOutline' : 'AnimatedUpload',
			onClick: (ev: React.SyntheticEvent): void => {
				ev.stopPropagation();
				navigateTo('/uploads');
			},
			badgeType: 'unread',
			badgeCounter: uploadsInfo.uploadsCounter || undefined,
			CustomComponent: SecondaryBarItemExpanded,
			active: location.pathname.includes('/uploads')
		};

		const trashItems: AccordionItemShape[] = [
			{
				id: ROOTS.TRASH_MY_ELEMENTS,
				label: t('secondaryBar.filtersList.myElements', 'My elements'),
				onClick: (ev: React.SyntheticEvent): void => {
					ev.stopPropagation();
					navigateTo('/filter/myTrash');
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes('/filter/myTrash')
			},
			{
				id: ROOTS.TRASH_SHARED_ELEMENTS,
				label: t('secondaryBar.filtersList.sharedElements', 'Shared elements'),
				onClick: (ev: React.SyntheticEvent): void => {
					ev.stopPropagation();
					navigateTo('/filter/sharedTrash');
				},
				CustomComponent: SecondaryBarItemExpanded,
				active: location.pathname.includes('/filter/sharedTrash')
			}
		];

		if (data?.getRootsList && data.getRootsList.length > 0) {
			const rootItems = orderBy(
				map(data.getRootsList, (root, idx) => {
					if (root) {
						switch (root.id) {
							case ROOTS.LOCAL_ROOT: {
								return {
									priority: 0,
									id: root.id,
									label: t('secondaryBar.filesHome', 'Home'),
									icon: 'HomeOutline',
									onClick: (ev: React.SyntheticEvent): void => {
										ev.stopPropagation();
										navigateTo(`/root/${root.id}`);
									},
									CustomComponent: SecondaryBarItemExpanded,
									active:
										location.pathname.includes(`/root/${root.id}`) ||
										location.search.includes(`folder=${root.id}`)
								};
							}
							case ROOTS.LOCAL_CHAT_ROOT: {
								return {
									priority: 3,
									id: root.id,
									label: t('secondaryBar.team', 'Team'),
									icon: 'TeamOutline',
									onClick: (ev: React.SyntheticEvent): void => {
										ev.stopPropagation();
										navigateTo(`/root/${root.id}`);
									},
									CustomComponent: SecondaryBarItemExpanded,
									active:
										location.pathname.includes(`/root/${root.id}`) ||
										location.search.includes(`folder=${root.id}`)
								};
							}
							case ROOTS.TRASH: {
								return {
									open: forceTrashOpen,
									id: root.id,
									priority: 2,
									icon: 'Trash2Outline',
									label: t('secondaryBar.filtersList.trash', 'Trash'),
									onClick: (): void => {
										if (!expanded) {
											secondaryBarItemVar('trash');
										}
									},
									items: trashItems,
									CustomComponent: SecondaryBarItemExpanded
								};
							}
							default: {
								return {
									priority: idx + 4,
									id: root.id,
									label: root.name,
									onClick: (ev: React.SyntheticEvent): void => {
										ev.stopPropagation();
										navigateTo(`/root/${root.id}`);
									},
									CustomComponent: SecondaryBarItemExpanded,
									active:
										location.pathname.includes(`/root/${root.id}`) ||
										location.search.includes(`folder=${root.id}`)
								};
							}
						}
					}
					return root;
				}),
				['priority'],
				['asc']
			);

			const mixedRootsAndFilters = orderBy(
				[...rootItems, ...filtersAsRoots],
				['priority'],
				['asc']
			);

			return [...mixedRootsAndFilters, filters, uploads];
		}
		return [
			{
				id: ROOTS.LOCAL_ROOT,
				label: t('secondaryBar.filesHome', 'Home'),
				icon: 'HomeOutline',
				items: [],
				onClick: (ev: React.SyntheticEvent): void => {
					ev.stopPropagation();
					navigateTo(`/root/${ROOTS.LOCAL_ROOT}`);
				},
				CustomComponent: SecondaryBarItemExpanded,
				active:
					location.pathname.includes(`/root/${ROOTS.LOCAL_ROOT}`) ||
					location.search.includes(`folder=${ROOTS.LOCAL_ROOT}`)
			},
			...filtersAsRoots,
			{
				id: ROOTS.TRASH,
				priority: 2,
				open: forceTrashOpen,
				onClick: (): void => {
					if (!expanded) {
						secondaryBarItemVar('trash');
					}
				},
				icon: 'Trash2Outline',
				label: t('secondaryBar.filtersList.trash', 'Trash'),
				items: trashItems,
				CustomComponent: SecondaryBarItemExpanded
			},
			filters,
			uploads
		];
	}, [t, forceFilterOpen, uploadsInfo, data, forceTrashOpen, navigateTo, expanded, location]);

	return (
		<Container height="fit">
			{expanded ? (
				<CustomAccordion role="menuitem" active items={items || []} />
			) : (
				map(
					items,
					(value, index) => value && <SecondaryBarItemNotExpanded key={index} item={value} />
				)
			)}
		</Container>
	);
};
