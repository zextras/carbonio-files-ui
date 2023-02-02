/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useEffect, useRef } from 'react';

import { Container, Row, useCombinedRefs } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

import { LIST_ITEM_HEIGHT } from '../../constants';
import { cssCalcBuilder } from '../../utils/utils';
import { LoadingIcon } from './LoadingIcon';

export const SCScrollContainer = styled(Container)`
	overflow-y: auto;
`;

interface ScrollContainerProps {
	loadMore?: () => void;
	hasMore?: boolean;
	loading?: boolean;
	children: React.ReactNode;
	fillerWithActions?: JSX.Element;
}

export const ScrollContainer = React.forwardRef<HTMLDivElement, ScrollContainerProps>(
	function ScrollContainerFn({ loadMore, hasMore, children, loading, fillerWithActions }, ref) {
		const loadMoreRef = useRef<HTMLButtonElement>(null);
		const loadMoreObserverRef = useRef<IntersectionObserver>();
		const scrollContainerRef = useCombinedRefs(ref) as React.MutableRefObject<HTMLDivElement>;

		useEffect(() => {
			if (loadMore) {
				// init the observer that let to load more items when scroll reaches bottom
				const options = {
					// root element is the scrollable container
					root: scrollContainerRef.current,
					// call action when entire element is visible
					threshold: 0.5
				};
				loadMoreObserverRef.current = new IntersectionObserver(async (entries) => {
					const entry = entries[0];
					if (entry.isIntersecting) {
						loadMore();
					}
				}, options);
			}

			return (): void => {
				// disconnect all observed element because current the observer is going to be recreated
				loadMoreObserverRef.current && loadMoreObserverRef.current.disconnect();
			};
		}, [loadMore, scrollContainerRef]);

		useEffect(() => {
			// attach the observer to the element that is going to trigger the action
			if (hasMore && !loading) {
				if (loadMoreRef.current && loadMoreObserverRef.current) {
					loadMoreObserverRef.current.observe(loadMoreRef.current);
				}
			}

			return (): void => {
				loadMoreObserverRef.current && loadMoreObserverRef.current.disconnect();
			};
		}, [hasMore, loading, loadMore]);

		return (
			<SCScrollContainer
				mainAlignment="flex-start"
				height="auto"
				maxHeight="100%"
				ref={scrollContainerRef}
			>
				{children}
				{hasMore && (
					<Row minHeight="3.75rem">
						<LoadingIcon icon="Refresh" onClick={loadMore} ref={loadMoreRef} />
					</Row>
				)}
				{fillerWithActions &&
					React.cloneElement(fillerWithActions, {
						children: <Row height={cssCalcBuilder(LIST_ITEM_HEIGHT, ['/', 2])} />
					})}
			</SCScrollContainer>
		);
	}
);
