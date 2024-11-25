/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo, useState } from 'react';

import { Container } from '@zextras/carbonio-design-system';

import { Displayer } from './components/Displayer';
import { SearchList } from './components/SearchList';
import { ViewLayout } from './ViewLayout';
import { ROOTS, VIEW_MODE } from '../constants';
import { ListContext } from '../contexts';
import { useUploadFileNewAction } from '../hooks/useUploadFileNewAction';

interface SearchViewProps {
	resultsHeader?: React.ReactNode;
}

export const SearchView = ({ resultsHeader }: SearchViewProps): React.JSX.Element => {
	const [searchExecuted, setSearchExecuted] = useState(false);
	useUploadFileNewAction(true, ROOTS.LOCAL_ROOT);

	const listContextValue = useMemo<Partial<React.ContextType<typeof ListContext>>>(
		() => ({
			queryCalled: searchExecuted,
			setQueryCalled: setSearchExecuted,
			viewMode: VIEW_MODE.list
		}),
		[searchExecuted]
	);

	return (
		<Container minHeight={0} maxHeight="100%" mainAlignment="flex-start">
			{resultsHeader}
			<ViewLayout
				listComponent={<SearchList />}
				displayerComponent={
					<Displayer translationKey="displayer.search" icons={['SearchOutline']} />
				}
				listContextValue={listContextValue}
				listWidth={'25%'}
				displayerWidth={'75%'}
			/>
		</Container>
	);
};
