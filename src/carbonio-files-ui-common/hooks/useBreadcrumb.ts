/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useState } from 'react';

import { ApolloError, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';

import { Crumb, CrumbNode } from '../types/common';
import { GetPathDocument, Maybe } from '../types/graphql/types';
import { buildCrumbs } from '../utils/utils';

export type UseBreadcrumbType = (
	folderId?: string,
	labels?: Crumb[],
	crumbAction?: (id: string, event?: React.SyntheticEvent | KeyboardEvent) => void
) => {
	data: Crumb[] | undefined;
	toggleExpanded: () => void;
	loading: boolean;
	error: ApolloError | undefined;
	expanded: boolean;
	expandable: boolean;
};

// folderId has the precedence over labels. If folderId has a value, breadcrumb is loaded dynamically from parents.
// labels, if defined, is used to initialize the breadcrumb
export const useBreadcrumb: UseBreadcrumbType = (folderId, labels, crumbAction) => {
	const [expanded, setExpanded] = useState(false);
	const [expandable, setExpandable] = useState(false);
	const [crumbs, setCrumbs] = useState<Crumb[]>(labels || []);
	const [t] = useTranslation();

	useEffect(() => {
		if (!folderId) {
			setCrumbs(labels || []);
			setExpanded(false);
		}
	}, [folderId, labels]);

	const updateCrumbs = useCallback(
		(nodes: Array<Maybe<CrumbNode> | undefined>) => {
			if (nodes.length > 0) {
				const breadcrumbs = buildCrumbs(nodes, crumbAction, t);
				if (breadcrumbs.length > 0) {
					breadcrumbs[breadcrumbs.length - 1].onClick = undefined;
				}
				setCrumbs(breadcrumbs);
				setExpandable(breadcrumbs.length > 2);
			} else {
				setCrumbs([]);
			}
		},
		[crumbAction, t]
	);

	const { data, loading, error } = useQuery(GetPathDocument, {
		variables: { node_id: folderId ?? '' },
		skip: !folderId,
		errorPolicy: 'all',
		returnPartialData: true
	});

	useEffect(() => {
		if (data?.getPath) {
			updateCrumbs(data.getPath);
			setExpanded(false);
		}
	}, [data?.getPath, updateCrumbs]);

	const toggle = useCallback(() => {
		setExpanded((prevState) => !prevState);
	}, []);

	return {
		data: expanded || crumbs.length <= 2 ? crumbs : crumbs.slice(-2),
		toggleExpanded: toggle,
		loading,
		error,
		expanded,
		expandable
	};
};
