/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Container, Responsive } from '@zextras/carbonio-design-system';

import { DisplayerContainer } from './components/StyledComponents';
import { useActiveNode } from '../../hooks/useActiveNode';
import { viewModeVar } from '../apollo/viewModeVar';
import { DISPLAYER_WIDTH, LIST_WIDTH, VIEW_MODE } from '../constants';
import { ListContext } from '../contexts';

interface ViewLayoutProps {
	listComponent: React.JSX.Element;
	displayerComponent: React.JSX.Element;
	listContextValue?: Partial<React.ContextType<typeof ListContext>>;
	listWidth?: string;
	displayerWidth?: string;
}

export const ViewLayout = ({
	listComponent,
	displayerComponent,
	listContextValue,
	listWidth = LIST_WIDTH,
	displayerWidth = DISPLAYER_WIDTH
}: ViewLayoutProps): React.JSX.Element => {
	const { activeNodeId } = useActiveNode();
	const viewMode = useReactiveVar(viewModeVar);
	const [isEmpty, setIsEmpty] = useState(false);

	const listContextValueMemo = useMemo(
		() => ({ isEmpty, setIsEmpty, viewMode, ...listContextValue }),
		[isEmpty, listContextValue, viewMode]
	);

	return (
		<ListContext.Provider value={listContextValueMemo}>
			<Container
				minHeight={0}
				orientation="row"
				crossAlignment="flex-start"
				mainAlignment="flex-start"
				width="fill"
				height="fill"
				background={'gray5'}
				borderRadius="none"
				maxHeight="100%"
			>
				<Responsive mode="desktop">
					<Container
						flexGrow={1}
						width={listWidth}
						mainAlignment="flex-start"
						crossAlignment="unset"
						borderRadius="none"
						background="gray6"
					>
						{listComponent}
					</Container>
					<DisplayerContainer
						width={displayerWidth}
						mainAlignment="flex-start"
						crossAlignment="flex-start"
						borderRadius="none"
						maxHeight={'fill'}
					>
						{(activeNodeId || listContextValueMemo.viewMode === VIEW_MODE.list) &&
							displayerComponent}
					</DisplayerContainer>
				</Responsive>
				<Responsive mode="mobile">{listComponent}</Responsive>
			</Container>
		</ListContext.Provider>
	);
};
