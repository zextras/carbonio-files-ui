/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useRef } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Dropdown, IconButton, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { nodeSortVar } from '../../apollo/nodeSortVar';
import { OrderTrend, OrderType } from '../../types/common';
import { NodeSort } from '../../types/graphql/types';
import { getInverseOrder, nodeSortGetter } from '../../utils/utils';

export const SortingComponent: React.VFC = () => {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const nodeSort = useReactiveVar(nodeSortVar);
	const [t] = useTranslation();

	const ascendingOrDescending = useMemo(() => {
		if (
			nodeSort === NodeSort.NameAsc ||
			nodeSort === NodeSort.UpdatedAtAsc ||
			nodeSort === NodeSort.SizeAsc
		) {
			return OrderTrend.Ascending;
		}
		if (
			nodeSort === NodeSort.NameDesc ||
			nodeSort === NodeSort.UpdatedAtDesc ||
			nodeSort === NodeSort.SizeDesc
		) {
			return OrderTrend.Descending;
		}
		throw Error('Unhandled order');
	}, [nodeSort]);

	const iconButtonIconProps = useMemo(
		() => (ascendingOrDescending === OrderTrend.Ascending ? 'ZaListOutline' : 'AzListOutline'),
		[ascendingOrDescending]
	);

	const orderType: OrderType = useMemo(() => {
		if (nodeSort === NodeSort.NameAsc || nodeSort === NodeSort.NameDesc) {
			return OrderType.Name;
		}
		if (nodeSort === NodeSort.UpdatedAtAsc || nodeSort === NodeSort.UpdatedAtDesc) {
			return OrderType.UpdatedAt;
		}
		if (nodeSort === NodeSort.SizeAsc || nodeSort === NodeSort.SizeDesc) {
			return OrderType.Size;
		}
		throw Error('Unhandled order');
	}, [nodeSort]);

	const tooltipLabel = useMemo(() => {
		switch (nodeSort) {
			case NodeSort.SizeAsc:
				return t('sortingDropdown.icon.tooltip.OrderSizeAscending', 'Ascending order by size');
			case NodeSort.SizeDesc:
				return t('sortingDropdown.icon.tooltip.OrderSizeDescending', 'Descending order by size');
			case NodeSort.NameAsc:
				return t('sortingDropdown.icon.tooltip.OrderNameAscending', 'Ascending order by name');
			case NodeSort.NameDesc:
				return t('sortingDropdown.icon.tooltip.OrderNameDescending', 'Descending order by name');
			case NodeSort.UpdatedAtAsc:
				return t(
					'sortingDropdown.icon.tooltip.OrderLastUpdateAscending',
					'Ascending order by last update'
				);
			case NodeSort.UpdatedAtDesc:
				return t(
					'sortingDropdown.icon.tooltip.OrderLastUpdateDescending',
					'Descending order by last update'
				);
			default:
				return '';
		}
	}, [nodeSort, t]);

	const switchAscendingOrDescendingOrder = useCallback(() => {
		nodeSortVar(nodeSortGetter(getInverseOrder(ascendingOrDescending), orderType));
	}, [ascendingOrDescending, orderType]);

	const selectOrderType = useCallback(
		(orderTypeValue) => {
			nodeSortVar(nodeSortGetter(ascendingOrDescending, orderTypeValue));
		},
		[ascendingOrDescending]
	);

	const selectNameOrderType = useCallback(() => {
		selectOrderType(OrderType.Name);
	}, [selectOrderType]);

	const selectUpdatedAtOrderType = useCallback(() => {
		selectOrderType(OrderType.UpdatedAt);
	}, [selectOrderType]);

	const selectSizeOrderType = useCallback(() => {
		selectOrderType(OrderType.Size);
	}, [selectOrderType]);

	const items = [
		{
			id: 'activity-1',
			label:
				ascendingOrDescending === OrderTrend.Descending
					? t('sortingDropdown.ascendingOrder', 'Ascending Order')
					: t('sortingDropdown.descendingOrder', 'Descending Order'),
			click: switchAscendingOrDescendingOrder,
			icon: ascendingOrDescending === OrderTrend.Descending ? 'ZaListOutline' : 'AzListOutline'
		},
		{
			id: 'activity-2',
			label: t('sortingDropdown.name', 'Name'),
			selected: orderType === OrderType.Name,
			click: selectNameOrderType,
			icon: orderType === OrderType.Name ? 'RadioButtonOn' : 'RadioButtonOff'
		},
		{
			id: 'activity-3',
			label: t('sortingDropdown.lastUpdate', 'Last Update'),
			selected: orderType === OrderType.UpdatedAt,
			click: selectUpdatedAtOrderType,
			icon: orderType === OrderType.UpdatedAt ? 'RadioButtonOn' : 'RadioButtonOff'
		},
		{
			id: 'activity-4',
			label: t('sortingDropdown.size', 'Size'),
			selected: orderType === OrderType.Size,
			click: selectSizeOrderType,
			icon: orderType === OrderType.Size ? 'RadioButtonOn' : 'RadioButtonOff'
		}
	];

	return (
		<Tooltip label={tooltipLabel} placement="top">
			<Dropdown
				items={items}
				multiple
				itemPaddingBetween="large"
				itemIconSize="large"
				selectedBackgroundColor="highlight"
			>
				<IconButton
					icon={iconButtonIconProps}
					size="large"
					ref={buttonRef}
					onClick={(): void => undefined}
				/>
			</Dropdown>
		</Tooltip>
	);
};
