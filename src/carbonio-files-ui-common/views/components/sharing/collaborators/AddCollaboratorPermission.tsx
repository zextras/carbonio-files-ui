/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import { filter } from 'lodash';

import { ButtonWithPopover } from './ButtonWithPopover';
import { NewSharePopoverContainer } from './NewSharePopoverContainer';
import { Node, Role, ShareChip } from '../../../../types/common';
import { Maybe, Share } from '../../../../types/graphql/types';
import { DeepPick } from '../../../../types/utils';
import { isFile, isFolder } from '../../../../utils/utils';

const rowRoleToIdxMap: { [key in Role]: number } = {
	[Role.Viewer]: 0,
	[Role.Editor]: 1
};

const roleAssignChecker: {
	[key in Role]: (node: Node<'permissions'>) => boolean;
} = {
	[Role.Editor]: (node: Node<'permissions'>): boolean =>
		(isFolder(node) && node.permissions.can_write_folder) ||
		(isFile(node) && node.permissions.can_write_file),
	[Role.Viewer]: (): boolean => true
};

const rowIdxToRoleMap: { [key: number]: Role } = {
	0: Role.Viewer,
	1: Role.Editor
};

interface AddCollaboratorPermissionProps {
	node: Node<'id' | 'owner' | 'permissions'> & {
		shares: Array<
			Maybe<Pick<Share, '__typename'> & DeepPick<Share, 'share_target', '__typename' | 'id'>>
		> | null;
	};
	contacts: ShareChip[];
	permissionDefined: Role;
	setPermissionDefined: React.Dispatch<React.SetStateAction<Role>>;
	isAllowedSharingChecked: boolean;
	allowSharingToggleCheck: () => void;
}

export const AddCollaboratorPermission = React.forwardRef<
	HTMLDivElement,
	AddCollaboratorPermissionProps
>(function AddCollaboratorPermissionFn(
	{
		node,
		contacts,
		permissionDefined,
		setPermissionDefined,
		isAllowedSharingChecked,
		allowSharingToggleCheck
	},
	ref
) {
	const [popoverOpen, setPopoverOpen] = useState(false);

	const switchSharingAllowed = useCallback((): void => {
		contacts.forEach((contact) => {
			const { value } = contact;
			value?.onUpdate(value.id, { sharingAllowed: !value.sharingAllowed });
		});
		allowSharingToggleCheck();
	}, [contacts, allowSharingToggleCheck]);

	const changeRole = useCallback(
		(containerIdx: keyof typeof rowIdxToRoleMap): void => {
			const desiredRole = rowIdxToRoleMap[containerIdx];
			contacts.forEach((contact) => {
				const { value } = contact;
				if (node && roleAssignChecker[desiredRole](node)) {
					value?.onUpdate(value.id, { role: rowIdxToRoleMap[containerIdx] });
				}
			});
			setPermissionDefined(rowIdxToRoleMap[containerIdx]);
		},
		[contacts, node, setPermissionDefined]
	);

	const disabledRows = useMemo(
		() => filter(rowRoleToIdxMap, (_idx, role) => !node || !roleAssignChecker[role as Role](node)),
		[node]
	);

	const openPermissionsPopover = useCallback(() => {
		setPopoverOpen((prevState) => !prevState);
	}, []);

	const updatePermissionsPopover = useCallback((newState: boolean) => {
		setPopoverOpen(newState);
	}, []);

	return (
		<ButtonWithPopover
			popoverOpen={popoverOpen}
			onValueChange={updatePermissionsPopover}
			openPermissionPopover={openPermissionsPopover}
			permissionDefined={permissionDefined}
			isAllowedSharingChecked={isAllowedSharingChecked}
		>
			{(): React.JSX.Element => (
				<NewSharePopoverContainer
					activeRow={rowRoleToIdxMap[contacts[0]?.value?.role ?? permissionDefined]}
					disabledRows={disabledRows}
					checkboxValue={isAllowedSharingChecked}
					checkboxOnClick={switchSharingAllowed}
					containerOnClick={changeRole}
				/>
			)}
		</ButtonWithPopover>
	);
});
