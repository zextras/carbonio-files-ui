/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Maybe } from './graphql/types';

export type OneOrMany<T> = T | T[];

export type ArrayOneOrMore<T> = [T] & T[];

export type DeepPick<T, K extends keyof T, KK extends keyof NonNullable<T[K]>> = {
	[P in K]: T[P] extends Record<KK, unknown> ? Pick<T[P], KK> : T[P];
};

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: T[SubKey] };

export type MakeDeepOptional<T, K extends keyof T> = Omit<T, K> & {
	[SubKey in K]?: Maybe<
		T[SubKey] extends Array<infer U>
			? Array<U | null | undefined>
			: T[SubKey] extends Record<string, unknown>
			? Partial<T[SubKey]>
			: T[SubKey]
	>;
};

export type Unwrap<T> = T extends Array<infer U> ? U : T;

export type NonNullableList<T extends Array<unknown>> = Array<NonNullable<Unwrap<T>>>;

export type NonNullableListItem<T extends Array<unknown>> = Unwrap<NonNullableList<T>>;

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
	? `${T}${Capitalize<SnakeToCamelCase<U>>}`
	: S;

export type SnakeToCamelCaseNested<T> = T extends Record<string, unknown>
	? {
			[K in keyof T as SnakeToCamelCase<K & string>]: SnakeToCamelCaseNested<T[K]>;
	  }
	: T;
