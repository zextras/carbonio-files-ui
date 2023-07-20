/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { CodegenConfig } from '@graphql-codegen/cli';
import { TypeScriptTypedDocumentNodesConfig } from '@graphql-codegen/typed-document-node';
import { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations';
import { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers';

const typescriptPluginConfig: TypeScriptPluginConfig = {
	useImplementingTypes: true,
	defaultScalarType: 'unknown',
	nonOptionalTypename: false,
	scalars: {
		DateTime: 'number',
		UploadItem: 'ClientTypes.UploadItem'
	},
	strictScalars: true
};

const config: CodegenConfig = {
	schema: {
		'https://raw.githubusercontent.com/Zextras/carbonio-files-ce/develop/core/src/main/resources/api/schema.graphql':
			{
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
							'/* eslint-disable camelcase,no-shadow,@typescript-eslint/ban-types */',
							'// THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT!',
							"import * as ClientTypes from './client-types'"
						]
					}
				}
			],
			config: {
				...typescriptPluginConfig,
				exportFragmentSpreadSubTypes: true,
				mergeFragmentTypes: true
			} satisfies TypeScriptPluginConfig &
				TypeScriptDocumentsPluginConfig &
				TypeScriptTypedDocumentNodesConfig
		},
		'src/carbonio-files-ui-common/types/graphql/possible-types.ts': {
			schema: 'src/carbonio-files-ui-common/graphql/client-schema.graphql',
			documents: ['src/**/*.graphql'],
			plugins: [
				'fragment-matcher',
				{ add: { content: '// THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT!' } }
			]
		},
		'src/carbonio-files-ui-common/types/graphql/resolvers-types.ts': {
			// exclude client documents from resolvers
			documents: ['src/**/(queries|mutations|fragments)/*.graphql'],
			plugins: [
				'typescript',
				'typescript-resolvers',
				{
					add: {
						content: [
							'/* eslint-disable camelcase,no-shadow,@typescript-eslint/ban-types */',
							'// THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT!'
						]
					}
				}
			],
			config: {
				...typescriptPluginConfig
			} satisfies TypeScriptPluginConfig & TypeScriptResolversPluginConfig
		}
	},
	hooks: {
		afterAllFileWrite:
			'eslint --fix --resolve-plugins-relative-to node_modules/@zextras/carbonio-ui-configs'
	}
};

export default config;
