/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo, useCallback, useState } from 'react';

import { ChipInput, ChipInputProps } from '@zextras/carbonio-design-system';
import { filter, reduce, throttle } from 'lodash';

import { Hint, Loader } from './StyledComponents';
import { isRawErrorSoapResponse, soapFetch } from '../../../network/network';
import { Contact } from '../../types/common';
import { AutocompleteGalRequest, AutocompleteGalResponse, ContactInfo } from '../../types/network';
import { getChipLabel } from '../../utils/utils';

function contactInfoToContact(contactInfo: ContactInfo): Contact {
	return {
		email: contactInfo._attrs.email,
		firstName: contactInfo._attrs.firstName,
		lastName: contactInfo._attrs.lastName,
		fullName: contactInfo._attrs.fullName
	};
}

const removeGroups: (autocompleteGalResponse: AutocompleteGalResponse) => ContactInfo[] = ({
	cn
}) => filter(cn, (item) => item._attrs.type !== 'group');

type AccountChipInputProps = Pick<
	ChipInputProps,
	| 'onInputType'
	| 'onChange'
	| 'value'
	| 'placeholder'
	| 'description'
	| 'hasError'
	| 'dropdownWidth'
	| 'inputRef'
>;

export const AccountChipInput = ({
	onInputType,
	onChange,
	value,
	placeholder,
	description,
	hasError,
	dropdownWidth,
	inputRef
}: AccountChipInputProps): React.JSX.Element => {
	const [loading, setLoading] = useState(false);

	const [searchResult, setSearchResult] = useState<Array<ContactInfo>>([]);

	const search = useMemo(
		() =>
			throttle(
				({ textContent }: React.KeyboardEvent & { textContent: string | null }) => {
					if (textContent === '' || textContent === null) {
						setSearchResult((prevSearchResult) =>
							prevSearchResult.length > 0 ? [] : prevSearchResult
						);
						return;
					}
					setLoading(true);
					soapFetch<AutocompleteGalRequest, { AutoCompleteGalResponse: AutocompleteGalResponse }>(
						'AutoCompleteGal',
						{
							needExp: true,
							name: textContent
						},
						'urn:zimbraAccount'
					)
						.then((rawSoapResponse) => {
							if (isRawErrorSoapResponse(rawSoapResponse)) {
								throw new Error('Error fetching AutocompleteGalRequest');
							}
							return rawSoapResponse.Body.AutoCompleteGalResponse;
						})
						.then(removeGroups)
						.then((cn) => {
							setLoading(false);
							setSearchResult(cn);
						})
						.catch((err: Error) => {
							console.error(err);
						});
				},
				500,
				{ leading: true }
			),
		[]
	);
	const onType = useCallback<NonNullable<ChipInputProps['onInputType']>>(
		(ev) => {
			onInputType?.(ev);
			if (ev.key.length === 1 || ev.key === 'Delete' || ev.key === 'Backspace') {
				search(ev);
			}
		},
		[onInputType, search]
	);

	const dropdownItems = useMemo(() => {
		const items = reduce<ContactInfo, NonNullable<ChipInputProps['options']>>(
			searchResult,
			(accumulator, contactInfo) => {
				const label = getChipLabel(contactInfoToContact(contactInfo));
				accumulator.push({
					label,
					id: `$${contactInfo.id}`,
					customComponent: <Hint label={label} email={contactInfo._attrs.email} />,
					value: { ...contactInfo, label }
				});
				return accumulator;
			},
			[]
		);
		if (loading) {
			items.push({
				id: 'loading',
				label: 'loading',
				customComponent: <Loader />,
				value: undefined
			});
		}
		return items;
	}, [loading, searchResult]);

	return (
		<ChipInput
			inputRef={inputRef}
			placeholder={placeholder}
			background={'gray5'}
			maxChips={1}
			separators={[]}
			confirmChipOnBlur={false}
			value={value}
			onChange={onChange}
			onInputType={onType}
			options={dropdownItems}
			dropdownWidth={dropdownWidth}
			dropdownMaxWidth={'100vh'}
			description={description}
			hasError={hasError}
		/>
	);
};
