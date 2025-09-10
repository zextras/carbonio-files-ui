/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';

import styled from '@emotion/styled';
import { Button, Popover } from '@zextras/carbonio-design-system';
import { filter } from 'lodash';
import { useTranslation } from 'react-i18next';

import { NewSharePopoverContainer } from './NewSharePopoverContainer';
import { Node, Role } from '../../../../types/common';
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

const CustomPopover = styled(Popover)`
	z-index: 1000;
`;

const StyledButton = styled(Button)`
	flex-shrink: 0;
	min-width: max-content;
`;

interface AddCollaboratorPermissionProps {
	node: Node<'permissions'>;
	role: Role;
	setRole: React.Dispatch<React.SetStateAction<Role>>;
	sharingAllowed: boolean;
	toggleSharingAllowed: () => void;
}

export const AddCollaboratorPermission = function AddCollaboratorPermissionFn({
	node,
	role,
	setRole,
	sharingAllowed,
	toggleSharingAllowed
}: AddCollaboratorPermissionProps): React.JSX.Element {
	const [t] = useTranslation();

	const [popoverOpen, setPopoverOpen] = useState(false);

	const changeRole = useCallback(
		(containerIdx: keyof typeof rowIdxToRoleMap): void => {
			setRole(rowIdxToRoleMap[containerIdx]);
		},
		[setRole]
	);

	const disabledRows = useMemo(
		() =>
			filter(
				rowRoleToIdxMap,
				(_idx, roleValue) => !node || !roleAssignChecker[roleValue as Role](node)
			),
		[node]
	);

	const togglePopover = useCallback(() => {
		setPopoverOpen((prevState) => !prevState);
	}, []);

	const anchorRef = useRef<HTMLDivElement>(null);

	return (
		<>
			<StyledButton
				ref={anchorRef}
				label={
					role === Role.Viewer
						? t('displayer.share.chip.popover.role.viewer', 'Viewer')
						: t('displayer.share.chip.popover.role.editor', 'Editor')
				}
				icon={sharingAllowed ? 'Share' : 'ShareOff'}
				onClick={togglePopover}
				secondaryAction={{
					icon: 'ChevronDown',
					onClick: togglePopover
				}}
				type={'outlined'}
			/>
			<CustomPopover
				open={popoverOpen}
				anchorEl={anchorRef}
				styleAsModal
				placement="bottom-end"
				onClose={() => setPopoverOpen(false)}
			>
				<NewSharePopoverContainer
					activeRow={rowRoleToIdxMap[role]}
					disabledRows={disabledRows}
					checkboxValue={sharingAllowed}
					checkboxOnClick={toggleSharingAllowed}
					containerOnClick={changeRole}
				/>
			</CustomPopover>
		</>
	);
};
