/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { getColor, Icon, Row, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled, { css, SimpleInterpolation } from 'styled-components';

import { useNavigation } from '../../../hooks/useNavigation';
import useBreadcrumb from '../../hooks/useBreadcrumb';
import { useDroppableCrumbs } from '../../hooks/useDroppableCrumbs';
import { Crumb } from '../../types/common';
import { InteractiveBreadcrumbs } from '../InteractiveBreadcrumbs';
import { OverFlowHiddenRow } from './StyledComponents';

const Cta = styled(Row)<{ $disabled?: boolean }>`
	${({ $disabled, theme }): SimpleInterpolation =>
		!$disabled &&
		css`
			&:hover {
				cursor: pointer;
				background-color: ${getColor('gray3', theme)};
			}
		`}
`;

export interface HeaderBreadcrumbsProps {
	folderId?: string;
	crumbs?: Crumb[];
}

export const HeaderBreadcrumbs: React.VFC<HeaderBreadcrumbsProps> = ({ folderId, crumbs }) => {
	const { navigateToFolder } = useNavigation();
	const [t] = useTranslation();

	const { data, toggleExpanded, loading, error, expanded, expandable, loadPath } = useBreadcrumb(
		folderId,
		crumbs,
		navigateToFolder
	);

	const {
		data: droppableCrumbs,
		containerRef,
		collapserProps,
		dropdownProps
	} = useDroppableCrumbs(data, folderId);

	const ctaDragEnterHandler = useCallback(() => {
		if (!expanded) {
			loadPath();
		}
	}, [expanded, loadPath]);

	const onDropdownOpen = useCallback(() => {
		dropdownProps.onOpen && dropdownProps.onOpen();
		const collapser = document.querySelector('.breadcrumbCollapser');
		collapser && collapser.classList.add('active');
	}, [dropdownProps]);

	const onDropdownClose = useCallback(() => {
		dropdownProps.onClose && dropdownProps.onClose();
		const collapser = document.querySelector('.breadcrumbCollapser');
		collapser && collapser.classList.remove('active');
	}, [dropdownProps]);

	return (
		<Row
			wrap="nowrap"
			ref={containerRef}
			width="auto"
			height="fill"
			mainAlignment="flex-start"
			minWidth={0}
		>
			{folderId && expandable && (
				<Tooltip
					/* i18next-extract-disable-next-line */
					label={t(
						`breadcrumb.expander.${expanded ? 'hide' : 'show'}`,
						expanded ? 'Hide previous folders' : 'Show previous folders'
					)}
				>
					<Cta
						onClick={toggleExpanded}
						wrap="nowrap"
						padding={{ all: 'extrasmall' }}
						onDragEnter={ctaDragEnterHandler}
					>
						<Icon icon="FolderOutline" size="large" />
						<Icon
							icon={expanded && !loading && !error ? 'ChevronLeft' : 'ChevronRight'}
							size="large"
						/>
					</Cta>
				</Tooltip>
			)}
			<OverFlowHiddenRow minWidth="0" width="fill" maxWidth="100%" mainAlignment="flex-start">
				{data && (
					<InteractiveBreadcrumbs
						crumbs={droppableCrumbs}
						collapserProps={collapserProps}
						dropdownProps={{ ...dropdownProps, onOpen: onDropdownOpen, onClose: onDropdownClose }}
						data-testid="customBreadcrumbs"
					/>
				)}
			</OverFlowHiddenRow>
		</Row>
	);
};
