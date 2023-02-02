/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';

import {
	Button,
	ChipInput,
	ChipInputProps,
	ChipItem,
	Container,
	Text
} from '@zextras/carbonio-design-system';
import {
	forEach,
	map,
	uniq,
	filter,
	reduce,
	size,
	some,
	findIndex,
	first,
	trim,
	keyBy,
	throttle
} from 'lodash';
import { useTranslation } from 'react-i18next';

import { soapFetch } from '../../../../network/network';
import { useCreateShareMutation } from '../../../hooks/graphql/mutations/useCreateShareMutation';
import { useGetAccountByEmailQuery } from '../../../hooks/graphql/queries/useGetAccountByEmailQuery';
import { useGetAccountsByEmailQuery } from '../../../hooks/graphql/queries/useGetAccountsByEmailQuery';
import { Contact, Node, Role, ShareChip } from '../../../types/common';
import { Account, Share, User } from '../../../types/graphql/types';
import {
	AutocompleteRequest,
	AutocompleteResponse,
	ContactGroupMatch,
	GetContactsRequest,
	GetContactsResponse,
	isAnAccount,
	isContactGroup,
	isDerefMember,
	isDistributionList,
	Match
} from '../../../types/network';
import { getChipLabel, sharePermissionsGetter } from '../../../utils/utils';
import { RouteLeavingGuard } from '../RouteLeavingGuard';
import { Hint, Loader } from '../StyledComponents';
import { AddShareChip } from './AddShareChip';

const emailRegex =
	// eslint-disable-next-line @typescript-eslint/no-unused-vars, max-len, no-control-regex
	/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

interface AddSharingProps {
	node: Pick<Node, '__typename' | 'id' | 'owner'> & {
		shares?: Array<Pick<Share, '__typename' | 'share_target'> | null | undefined>;
	};
}

function isUser(account: Pick<Account, '__typename'>): account is User {
	return account.__typename === 'User';
}

function matchToContact(match: Match): Contact {
	return {
		email: match.email,
		firstName: match.first,
		lastName: match.last,
		company: match.company,
		fullName: match.full
	};
}

// function derefContactInfoToContact({ _attrs: derefAttrs }: DerefContactInformation): Contact {
// 	return derefAttrs;
// }

const removeDL: (autocompleteResponse: AutocompleteResponse) => Match[] = ({ match }) =>
	filter(match, (m) => {
		const isDL = isDistributionList(m);
		return !isDL;
	});

const extractCleanMailIfNotAGroup: (match: Match[]) => Match[] = (match) =>
	reduce<Match, Match[]>(
		match,
		(accumulator, m) => {
			if (isAnAccount(m)) {
				accumulator.push({
					...m,
					email: first<string>(emailRegex.exec(m.email))
				});
			} else {
				accumulator.push(m);
			}
			return accumulator;
		},
		[]
	);

function cleanEmails<T extends { email?: string | undefined }>(
	emails: T[],
	chips: ShareChip[],
	node: AddSharingProps['node']
): T[] {
	return reduce<T, T[]>(
		emails,
		(acc, result) => {
			// exclude emails already added in dropdown
			const localIndex = findIndex(acc, (item) => item.email === result.email);
			if (localIndex >= 0) {
				return acc;
			}
			// exclude emails already added as new shares
			const alreadyInChips = findIndex(chips, (item) => item.value.email === result.email) >= 0;
			if (alreadyInChips) {
				return acc;
			}
			// exclude email of node owner
			if (result.email === node.owner.email) {
				return acc;
			}
			// exclude emails already added as collaborators
			// TODO: handle distribution lists
			const alreadyInCollaborators =
				findIndex(
					node.shares,
					(share) =>
						share?.share_target !== undefined &&
						share?.share_target !== null &&
						isUser(share.share_target) &&
						share.share_target.email === result.email
				) >= 0;

			if (alreadyInCollaborators) {
				return acc;
			}
			acc.push(result);
			return acc;
		},
		[]
	);
}

export const AddSharing: React.VFC<AddSharingProps> = ({ node }) => {
	const [t] = useTranslation();

	const [createShare] = useCreateShareMutation();
	const getAccountByEmailLazyQuery = useGetAccountByEmailQuery();
	const getAccountsByEmailLazyQuery = useGetAccountsByEmailQuery();

	const [mailTextValue, setMailTextValue] = useState('');

	const [searchResult, setSearchResult] = useState<Match[]>([]);
	const [chips, setChips] = useState<ShareChip[]>([]);
	const isDirty = useMemo(
		() => size(chips) > 0 || mailTextValue.length > 0,
		[chips, mailTextValue.length]
	);
	const thereAreInvalidChips = useMemo(
		() => some(chips, (chip) => chip.value.id === undefined),
		[chips]
	);

	const inputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);

	const createShareCallback = useCallback(() => {
		const customMessageText = trim(mailTextValue);
		const promises = map(chips, (chip) => {
			if (chip.value.id) {
				return createShare(
					node,
					chip.value.id,
					sharePermissionsGetter(chip.value.role, chip.value.sharingAllowed),
					customMessageText.length > 0 ? customMessageText : undefined
				);
			}
			return Promise.resolve();
		});
		setChips([]);
		setMailTextValue('');

		return Promise.allSettled(promises).then((results) => {
			const notCreatedChips = reduce<typeof results[number], ShareChip[]>(
				results,
				(accumulator, createSharePromiseResult, index) => {
					if (createSharePromiseResult.status === 'rejected') {
						accumulator.push(chips[index]);
					}
					return accumulator;
				},
				[]
			);
			// show chips which creation went in error inside the chipInput
			setChips(notCreatedChips);
			// if at least one creation went in error, restore the custom message
			setMailTextValue(notCreatedChips.length === 0 ? '' : customMessageText);
			return results;
		});
	}, [chips, createShare, mailTextValue, node]);

	const updateChip = useCallback<ShareChip['value']['onUpdate']>((id, updatedValue) => {
		setChips((prevState) => {
			const newState = [...prevState];
			const idx = findIndex(newState, (item) => item.value.id === id);
			newState[idx] = { ...newState[idx], value: { ...newState[idx].value, ...updatedValue } };
			return newState;
		});
	}, []);

	const addShareContact = useCallback(
		(contact: Contact) => (): void => {
			setSearchResult([]);
			const alreadyInChips = some(chips, ['email', contact.email]);
			if (!alreadyInChips && contact.email) {
				getAccountByEmailLazyQuery({
					variables: {
						email: contact.email
					}
				})
					.then((result) => {
						if (result?.data?.getAccountByEmail) {
							const contactWithId: ShareChip = {
								value: {
									...contact,
									id: result.data.getAccountByEmail.id,
									role: Role.Viewer,
									sharingAllowed: false,
									onUpdate: updateChip
								}
							};
							setChips((c) => [...c, contactWithId]);
						}
					})
					.catch(() => null); // FIXME: this catch shouldn't be necessary but for some reason it is
			}
		},
		[chips, getAccountByEmailLazyQuery, updateChip]
	);

	const addShareContactGroup = useCallback(
		(contactGroupMatch: ContactGroupMatch) => (): void => {
			if (inputRef.current) {
				inputRef.current.textContent = '';
				inputRef.current.focus();
			}
			setSearchResult([]);
			soapFetch<GetContactsRequest, GetContactsResponse>('GetContacts', {
				cn: {
					id: contactGroupMatch.id
				},
				derefGroupMember: true
			}).then((result) => {
				const members = result.cn && result.cn[0].m;
				const galMembers: Array<ShareChip['value']> = [];
				const inlineAndContactMemberEmails: string[] = [];

				forEach(members, (member) => {
					if (member.type === 'I') {
						inlineAndContactMemberEmails.push(member.value);
					} else if (member.type === 'C' && isDerefMember(member)) {
						inlineAndContactMemberEmails.push(member.cn[0]._attrs.email);
					} else if (
						member.type === 'G' &&
						isDerefMember(member) &&
						// TODO: handle distribution lists. For now, exclude them from members
						member.cn[0]._attrs.type !== 'group'
					) {
						galMembers.push({
							...member.cn[0]._attrs,
							role: Role.Viewer,
							sharingAllowed: false,
							id: member.cn[0]._attrs.zimbraId,
							onUpdate: updateChip
						});
					}
				});

				if (size(inlineAndContactMemberEmails) > 0) {
					const uniqMemberEmails = uniq(inlineAndContactMemberEmails);
					getAccountsByEmailLazyQuery({
						variables: {
							emails: uniqMemberEmails
						}
					}).then((getAccountsByEmailLazyQueryResult) => {
						if (getAccountsByEmailLazyQueryResult.data?.getAccountsByEmail) {
							const validAccountsMap = keyBy(
								filter(
									getAccountsByEmailLazyQueryResult.data?.getAccountsByEmail,
									(acc) => acc !== null
								),
								'email'
							);

							const mappedMembers = map<string, ShareChip['value']>(uniqMemberEmails, (email) => ({
								...validAccountsMap[email],
								email,
								role: Role.Viewer,
								sharingAllowed: false,
								id: validAccountsMap[email]?.id,
								onUpdate: updateChip
							}));

							const cleanedEmails = cleanEmails([...mappedMembers, ...galMembers], chips, node);
							const cleanedChips = map<ShareChip['value'], ShareChip>(
								cleanedEmails,
								(chipValue) => ({
									id: chipValue.id,
									value: chipValue
								})
							);

							setChips((c) => [...c, ...cleanedChips]);
						}
					});
				} else {
					const cleanedEmails = cleanEmails(galMembers, chips, node);
					const cleanedChips = map<ShareChip['value'], ShareChip>(cleanedEmails, (chipValue) => ({
						value: chipValue
					}));
					setChips((c) => [...c, ...cleanedChips]);
				}
			});
		},
		[chips, getAccountsByEmailLazyQuery, node, updateChip]
	);

	const search = useMemo(
		() =>
			throttle(
				({ textContent }: React.KeyboardEvent & { textContent: string }) => {
					if (textContent === '') {
						setSearchResult((h) => (h.length > 0 ? [] : h));
						return;
					}
					setLoading(true);
					soapFetch<AutocompleteRequest, AutocompleteResponse>('AutoComplete', {
						includeGal: true,
						needExp: true,
						t: 'all',
						name: {
							_content: textContent
						}
					})
						.then(removeDL)
						.then(extractCleanMailIfNotAGroup)
						.then((remoteResults) => {
							setLoading(false);
							setSearchResult(cleanEmails(remoteResults, chips, node));
						})
						.catch((err: Error) => {
							console.error(err);
						});
				},
				500,
				{ leading: true }
			),
		[chips, node]
	);

	const onChipsChange = useCallback((newChips: ChipItem[]) => {
		const filterValidShares = filter<ChipItem, ShareChip>(
			newChips,
			(chip): chip is ShareChip =>
				chip !== undefined &&
				chip !== null &&
				typeof chip.value === 'object' &&
				chip.value !== null &&
				'role' in chip.value
		);
		setChips(filterValidShares);
	}, []);

	const onType = useCallback(
		(ev) => {
			if (ev.key.length === 1 || ev.key === 'Delete' || ev.key === 'Backspace') {
				search(ev);
			}
		},
		[search]
	);

	const dropdownItems = useMemo(() => {
		const items = reduce<Match, NonNullable<ChipInputProps['options']>>(
			searchResult,
			(accumulator, match) => {
				if (isAnAccount(match)) {
					const contact = matchToContact(match);
					accumulator.push({
						label: `${match.email}`,
						id: `$${match.email}`,
						customComponent: <Hint label={getChipLabel(contact)} email={match.email} />,
						click: addShareContact(contact)
					});
				}
				if (isContactGroup(match)) {
					accumulator.push({
						label: `${match.display}`,
						id: `$${match.display}`,
						customComponent: <Hint label={match.display} />,
						click: addShareContactGroup(match)
					});
				}
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
	}, [addShareContact, loading, searchResult, addShareContactGroup]);

	const onAdd = useCallback<NonNullable<ChipInputProps['onAdd']>>(
		(value) => {
			function isContact(val: unknown): val is Contact {
				return typeof val === 'object' && val !== null && 'email' in val;
			}

			if (isContact(value)) {
				addShareContact(value);
			}
			return {};
		},
		[addShareContact]
	);

	// const customMessageChangeHandler = useCallback(
	// 	(ev: React.ChangeEvent<HTMLInputElement>): void => {
	// 		setMailTextValue(ev.target.value);
	// 	},
	// 	[]
	// );

	return (
		<Container padding={{ top: 'large' }}>
			<RouteLeavingGuard
				when={isDirty}
				onSave={createShareCallback}
				dataHasError={thereAreInvalidChips || (isDirty && chips.length === 0)}
			>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line1', 'Do you want to leave the page without saving?')}
				</Text>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost')}
				</Text>
			</RouteLeavingGuard>
			<Container data-testid="add-shares-input-container">
				<ChipInput
					inputRef={inputRef}
					placeholder={t('displayer.share.addShare.input.placeholder', 'Add new people or groups')}
					confirmChipOnBlur={false}
					confirmChipOnSpace={false}
					separators={['']}
					onInputType={onType}
					onChange={onChipsChange}
					value={chips}
					ChipComponent={AddShareChip as React.ComponentType<ChipItem>}
					options={dropdownItems}
					onAdd={onAdd}
					background="gray5"
					bottomBorderColor="gray3"
					wrap="wrap"
					data-testid="add-sharing-chip-input"
				/>
			</Container>

			<Container orientation="horizontal" mainAlignment="flex-end" padding={{ top: 'small' }}>
				<Button
					label="Share"
					color="primary"
					onClick={createShareCallback}
					disabled={!(size(chips) > 0) || thereAreInvalidChips}
				/>
			</Container>
		</Container>
	);
};
