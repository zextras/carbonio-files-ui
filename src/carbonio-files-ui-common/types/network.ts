/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export type RequestName = 'AutoComplete' | 'GetContacts' | 'AutoCompleteGal';

/**
 * @see https://files.zimbra.com/docs/soap_api/8.8.15/api-reference/zimbraMail/AutoComplete.html
 */
export interface AutocompleteRequest {
	includeGal?: boolean;
	needExp?: boolean;
	t?: 'all' | 'account' | 'resource' | 'group';
	name: { _content: string };
}

export interface AutocompleteResponse {
	match: Array<Match>;
}

export interface AutocompleteGalRequest {
	needExp?: boolean;
	type?: 'all' | 'account' | 'resource' | 'group';
	name: string;
}

export interface ContactInfoAttrs {
	zimbraId: string;
	email: string;
	lastName: string;
	firstName?: string;
	fullName: string;
	objectClass: Array<
		| 'zimbraDistributionList'
		| 'zimbraMailRecipient'
		| 'inetOrgPerson'
		| 'zimbraAccount'
		| 'amavisAccount'
	>;
	type?: 'group' | unknown;
}

export interface ContactInfo {
	id: string;
	ref: string;
	_attrs: ContactInfoAttrs;
}

export interface AutocompleteGalResponse {
	cn: Array<ContactInfo>;
}

export interface GetContactsRequest {
	cn: { id: string };
	derefGroupMember?: boolean;
}

export interface Member {
	value: string;
	type: 'C' | 'G' | 'I';
	cn?: Array<ContactInformation>;
}

export interface DerefMember extends Member {
	value: string;
	type: 'C' | 'G' | 'I';
	cn: Array<DerefContactInformation>;
}

export function isDerefMember(member: Member): member is DerefMember {
	return member.cn !== undefined;
}

export interface ContactInformation {
	d?: number;
	id: string;
	l?: string;
	fileAsStr?: string;
	rev?: number;
	_attrs?: {
		firstName?: string;
		fileAs?: string;
		email?: string;
		fullName?: string;
		nickname: string;
		lastName?: string;
		type?: string;
		zimbraId?: string;
	};
	m?: Array<Member>;
}

export interface DerefContactInformation extends ContactInformation {
	_attrs: ContactInformation['_attrs'] & {
		email: string;
	};
}

export interface GetContactsResponse {
	cn?: Array<ContactInformation>;
}

export interface Match {
	email?: string;
	type?: 'gal' | 'contact' | 'rankingTable';
	ranking?: number; // Ranking
	isGroup?: boolean; // Set if the entry is a group
	exp?: boolean; // Set if the user has the right to expand group members. Returned only if needExp is set in the request and only on group entries (isGroup is set).
	id?: string; // ID
	l?: string; // Folder ID
	display?: string; // String that should be displayed by the client
	first?: string; // First Name
	middle?: string; // Middle Name
	last?: string; // Last Name
	full?: string; // Full Name
	nick?: string; // Nick Name
	company?: string; // Company Name
	fileas?: string; // FileAs
}

export interface ContactGroupMatch extends Match {
	type: 'contact';
	isGroup: true;
	display: string;
	id: string;
}

export interface DistributionListMatch extends Match {
	type: 'gal';
	isGroup: true;
}

export interface ContactAccountMatch extends Match {
	email: string;
	type: 'contact';
	isGroup: false;
	display: string;
}

export interface GalAccountMatch extends Match {
	email: string;
	type: 'gal';
	isGroup: false;
}

export function isDistributionList(match: Match): match is DistributionListMatch {
	return match.isGroup === true && match.type === 'gal';
}

export function isContactGroup(match: Match): match is ContactGroupMatch {
	return match.isGroup === true && match.type === 'contact';
}

export function isAGroup(match: Match): match is DistributionListMatch | ContactGroupMatch {
	return match.isGroup === true;
}

export function isAnAccount(match: Match): match is GalAccountMatch | ContactAccountMatch {
	return match.isGroup === false;
}
