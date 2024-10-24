/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { createContext } from 'react';

import { ViewMode, viewModeVar } from '../apollo/viewModeVar';

export const ListContext = createContext<{
	isEmpty: boolean;
	setIsEmpty: (empty: boolean) => void;
	// describe whether the list relates to a query or not.
	// Should be false only when no data should be shown because no query has been executed
	queryCalled?: boolean;
	setQueryCalled?: (queryCalled: boolean) => void;
	viewMode: ViewMode;
}>({
	viewMode: viewModeVar(),
	isEmpty: true,
	setIsEmpty: () => {
		// not implemented
	}
});

export const NodeAvatarIconContext = createContext<{
	tooltipLabel?: string;
	tooltipDisabled:
		| boolean
		| (({ disabled, selectable }: { disabled: boolean; selectable: boolean }) => boolean);
}>({ tooltipDisabled: true });

export const ListHeaderActionContext = createContext<React.ReactNode>(null);
