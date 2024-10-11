/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

declare module '*.svg' {
	import React from 'react';

	export const ReactComponent: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
	const src: string;
	export default src;
}

declare module '*.graphql' {
	import { DocumentNode } from 'graphql';

	const defaultDocument: DocumentNode;

	export default defaultDocument;
}
