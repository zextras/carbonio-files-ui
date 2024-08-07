/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useContext, useMemo } from 'react';

import { Container, Divider } from '@zextras/carbonio-design-system';
import { useLocation } from 'react-router-dom';

import { ListHeaderActionContext } from '../carbonio-files-ui-common/contexts';
import { Crumb } from '../carbonio-files-ui-common/types/common';
import { isSearchView } from '../carbonio-files-ui-common/utils/utils';
import { AdvancedSearchButtonHeader } from '../carbonio-files-ui-common/views/components/AdvancedSearchButtonHeader';
import { HeaderBreadcrumbs } from '../carbonio-files-ui-common/views/components/HeaderBreadcrumbs';
import {
	ListHeaderProps as CommonListHeaderProps,
	ListHeader as CommonListHeader
} from '../carbonio-files-ui-common/views/components/ListHeader';
import { LoadingIcon } from '../carbonio-files-ui-common/views/components/LoadingIcon';

type ListHeaderProps = Omit<
	CommonListHeaderProps,
	'hide' | 'firstCustomComponent' | 'secondCustomComponent' | 'headerEndComponent'
> & {
	folderId?: string;
	crumbs?: Crumb[];
	loadingData?: boolean;
	selectedCount?: number;
};

const ListHeader: React.VFC<ListHeaderProps> = ({
	folderId,
	crumbs,
	loadingData,
	isSelectionModeActive,
	unSelectAll,
	selectAll,
	permittedSelectionModeActionsItems,
	exitSelectionMode,
	isAllSelected,
	selectedCount
}) => {
	const location = useLocation();
	const inSearchView = isSearchView(location);
	const actionComponent = useContext(ListHeaderActionContext);

	const firstCustomComponent = useMemo(
		() => <HeaderBreadcrumbs crumbs={crumbs} folderId={folderId} />,
		[crumbs, folderId]
	);

	const headerEndComponent = useMemo(
		() => (
			<>
				{loadingData && <LoadingIcon icon="Refresh" color="primary" size="large" />}
				{actionComponent}
			</>
		),
		[actionComponent, loadingData]
	);

	const secondCustomComponent = useMemo(
		() => (
			<Container height="fit">
				{inSearchView && (
					<>
						<Divider color="gray3" />
						<AdvancedSearchButtonHeader />
					</>
				)}
			</Container>
		),
		[inSearchView]
	);

	return (
		<CommonListHeader
			selectedCount={selectedCount}
			isSelectionModeActive={isSelectionModeActive}
			unSelectAll={unSelectAll}
			selectAll={selectAll}
			permittedSelectionModeActionsItems={permittedSelectionModeActionsItems}
			hide={inSearchView}
			headerEndComponent={headerEndComponent}
			firstCustomComponent={firstCustomComponent}
			secondCustomComponent={secondCustomComponent}
			exitSelectionMode={exitSelectionMode}
			isAllSelected={isAllSelected}
		/>
	);
};

export default ListHeader;
