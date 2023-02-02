/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useState } from 'react';

import { ApolloError, useApolloClient, useQuery } from '@apollo/client';
import { size } from 'lodash';
import { useTranslation } from 'react-i18next';

import GET_PARENT from '../graphql/queries/getParent.graphql';
import GET_PATH from '../graphql/queries/getPath.graphql';
import { Crumb, CrumbNode } from '../types/common';
import {
	GetParentQuery,
	GetParentQueryVariables,
	GetPathQuery,
	GetPathQueryVariables,
	Maybe,
	Node
} from '../types/graphql/types';
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
	loadPath: () => void;
	expandable: boolean;
};

// folderId has the precedence over labels. If folderId has a value, breadcrumb is loaded dynamically from parents.
// labels, if defined, is used to initialize the breadcrumb
const useBreadcrumb: UseBreadcrumbType = (folderId, labels, crumbAction) => {
	const [expanded, setExpanded] = useState(false);
	const [expandable, setExpandable] = useState(false);
	const [crumbs, setCrumbs] = useState<Crumb[]>(labels || []);
	const apolloClient = useApolloClient();
	const [t] = useTranslation();

	useEffect(() => {
		if (!folderId) {
			setCrumbs(labels || []);
		}
	}, [folderId, labels]);

	const updateCrumbs = useCallback(
		(nodes: CrumbNode | Array<Maybe<Pick<Node, 'id' | 'name' | 'type'>> | undefined>) => {
			let breadcrumbs: Crumb[] = [];
			if (nodes) {
				breadcrumbs = buildCrumbs(nodes, crumbAction, t);
				breadcrumbs[size(breadcrumbs) - 1].click = undefined;
				setCrumbs(breadcrumbs);
				// breadcrumb can be expanded if not already expanded and if current node parent has a parent itself
				if (!(nodes instanceof Array)) {
					const isExpandable = nodes.parent?.parent != null;
					setExpandable(isExpandable);
				}
			} else {
				setCrumbs([]);
			}
		},
		[crumbAction, t]
	);

	// main query that loads short breadcrumb
	const { loading, error } = useQuery<GetParentQuery, GetParentQueryVariables>(GET_PARENT, {
		variables: {
			node_id: folderId || ''
		},
		skip: !folderId,
		onCompleted(data) {
			if (data?.getNode) {
				updateCrumbs(data.getNode);
				setExpanded(false);
			}
		}
	});

	const loadPath = useCallback(() => {
		// use apollo query to fetch full path only when request
		if (folderId && expandable) {
			apolloClient
				.query<GetPathQuery, GetPathQueryVariables>({
					query: GET_PATH,
					variables: {
						node_id: folderId
					}
				})
				.then(({ data: { getPath } }) => {
					updateCrumbs(getPath);
					setExpanded(true);
				})
				.catch((err) => console.error(err));
		}
	}, [apolloClient, expandable, folderId, updateCrumbs]);

	const toggle = useCallback(() => {
		if (!expanded && expandable && folderId) {
			loadPath();
		} else {
			setExpanded((prevState) => !prevState);
		}
	}, [expanded, expandable, folderId, loadPath]);

	return {
		data: expanded || crumbs.length <= 2 ? crumbs : crumbs.slice(-2),
		toggleExpanded: toggle,
		loading,
		error,
		expanded,
		loadPath,
		expandable
	};
};

export default useBreadcrumb;
