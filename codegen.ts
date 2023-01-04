/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
	schema: {
		'': {
			headers: {
				Cookie: ''
			}
		}
	},
	generates: {
		'src/carbonio-files-ui-common/graphql/schema.graphql': {
			plugins: [
				'schema-ast',
				{
					add: {
						content: ['" THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT! "']
					}
				}
			]
		},
		'src/carbonio-files-ui-common/types/graphql/types.ts': {
			schema: 'src/carbonio-files-ui-common/graphql/client-schema.graphql',
			documents: ['src/**/*.graphql'],
			plugins: [
				'typescript',
				'typescript-operations',
				'typed-document-node',
				{
					add: {
						content: [
							'/* eslint-disable camelcase,no-shadow */',
							'// THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT!',
							"import * as ClientTypes from './client-types'"
						]
					}
				}
			],
			config: {
				defaultScalarType: 'unknown',
				exportFragmentSpreadSubTypes: true,
				mergeFragmentTypes: true,
				nonOptionalTypename: false,
				scalars: {
					DateTime: 'number',
					UploadItem: 'ClientTypes.UploadItem'
				},
				strictScalars: true
			}
		},
		'src/carbonio-files-ui-common/types/graphql/possible-types.ts': {
			schema: 'src/carbonio-files-ui-common/graphql/client-schema.graphql',
			documents: ['src/**/*.graphql'],
			plugins: [
				'fragment-matcher',
				{ add: { content: '// THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT!' } }
			]
		}
	},
	hooks: {
		afterAllFileWrite:
			'eslint --fix --resolve-plugins-relative-to node_modules/@zextras/carbonio-ui-configs'
	}
};

export default config;