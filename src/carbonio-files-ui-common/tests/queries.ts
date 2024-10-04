/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
	ByRoleMatcher,
	ByRoleOptions,
	GetAllBy,
	queries,
	queryHelpers,
	within
} from '@testing-library/react';

/**
 * Matcher function to search a string in more html elements and not just in a single element.
 */
const queryAllByTextWithMarkup: GetAllBy<[string | RegExp]> = (container, text) =>
	within(container).queryAllByText((_content, element) => {
		if (element && element instanceof HTMLElement) {
			const hasText = (singleNode: Element): boolean => {
				const regExp = RegExp(text);
				return singleNode.textContent != null && regExp.test(singleNode.textContent);
			};
			// eslint-disable-next-line testing-library/no-node-access
			const childrenDontHaveText = Array.from(element.children).every((child) => !hasText(child));
			return hasText(element) && childrenDontHaveText;
		}
		return false;
	});

const getByTextWithMarkupMultipleError = (
	container: Element | null,
	text: string | RegExp
): string => `Found multiple elements with text: ${text} inside ${container}`;
const getByTextWithMarkupMissingError = (
	container: Element | null,
	text: string | RegExp
): string => `Unable to find an element with text: ${text} inside ${container}`;

const [
	queryByTextWithMarkup,
	getAllByTextWithMarkup,
	getByTextWithMarkup,
	findAllByTextWithMarkup,
	findByTextWithMarkup
] = queryHelpers.buildQueries<[string | RegExp]>(
	queryAllByTextWithMarkup,
	getByTextWithMarkupMultipleError,
	getByTextWithMarkupMissingError
);

/**
 * Matcher function to search an icon button through the icon data-testid
 */
type ByRoleWithIconOptions = ByRoleOptions & {
	icon: string | RegExp;
};
/**
 * Matcher function to search an icon button through the icon data-testid
 */
const queryAllByRoleWithIcon: GetAllBy<[ByRoleMatcher, ByRoleWithIconOptions]> = (
	container,
	role,
	{ icon, ...options }
) =>
	within(container)
		.queryAllByRole(role, options)
		.filter((element) => within(element).queryByTestId(icon) !== null);
const getByRoleWithIconMultipleError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string =>
	`Found multiple elements with role ${role as string} and icon ${options.icon} inside ${container}`;
const getByRoleWithIconMissingError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string =>
	`Unable to find an element with role ${role as string} and icon ${options.icon} inside ${container}`;

const [
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
] = queryHelpers.buildQueries<[ByRoleMatcher, ByRoleWithIconOptions]>(
	queryAllByRoleWithIcon,
	getByRoleWithIconMultipleError,
	getByRoleWithIconMissingError
);

export const queriesExtended = {
	...queries, // byTextWithMarkup
	queryByTextWithMarkup,
	getAllByTextWithMarkup,
	getByTextWithMarkup,
	findAllByTextWithMarkup,
	findByTextWithMarkup,
	// byRoleWithIcon
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
};
