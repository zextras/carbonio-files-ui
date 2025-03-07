/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Modal, Button } from '@zextras/carbonio-design-system';
import { filter } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useBlocker, Location, BlockerFunction } from 'react-router-dom';

function areLocationsDifferent(loc1: Location, loc2: Location): boolean {
	return loc1.pathname !== loc2.pathname || loc1.search !== loc2.search || loc1.hash !== loc2.hash;
}

type RouteLeavingGuardProps = React.PropsWithChildren<{
	when: boolean;
	onSave: () => Promise<PromiseSettledResult<Awaited<unknown>>[]>;
	dataHasError?: boolean;
}>;
export const RouteLeavingGuard = ({
	children,
	when,
	onSave,
	dataHasError = false
}: RouteLeavingGuardProps): React.JSX.Element => {
	const [t] = useTranslation();

	const blockerFunction: BlockerFunction = ({ currentLocation, nextLocation }) => {
		const areDifferent = areLocationsDifferent(currentLocation, nextLocation);
		return when && areDifferent;
	};

	// Block navigating elsewhere when data has been entered into the input
	const blocker = useBlocker(blockerFunction);

	const cancel = (): void => {
		blocker.reset?.();
	};

	const onConfirm = (): void => {
		onSave()
			.then((results) => {
				const rejected = filter(
					results,
					(result): result is PromiseRejectedResult => result.status === 'rejected'
				);
				if (rejected.length > 0) {
					console.error(rejected);
					cancel();
				} else {
					blocker.proceed?.();
				}
			})
			.catch((reason) => {
				console.error(reason);
				cancel();
			});
	};

	const onSecondaryAction = (): void => {
		blocker.proceed?.();
	};

	return (
		<Modal
			showCloseIcon
			closeIconTooltip={t('modal.close.tooltip', 'Close')}
			open={blocker.state === 'blocked'}
			title={
				dataHasError
					? t('modal.unsaved_changes.title.cannot_saved_changes', 'Some changes cannot be saved')
					: t('modal.unsaved_changes.title.unsaved_changes', 'You have unsaved changes')
			}
			onClose={cancel}
			onConfirm={dataHasError ? onSecondaryAction : onConfirm}
			confirmLabel={
				dataHasError
					? t('modal.unsaved_changes.button.leave_anyway', 'Leave anyway')
					: t('modal.unsaved_changes.button.save_and_leave', 'Save and leave')
			}
			onSecondaryAction={dataHasError ? cancel : onSecondaryAction}
			secondaryActionLabel={
				dataHasError
					? t('modal.button.cancel', 'Cancel')
					: t('modal.unsaved_changes.button.leave_anyway', 'Leave anyway')
			}
			optionalFooter={
				!dataHasError ? (
					<Button
						color="secondary"
						type="outlined"
						label={t('modal.button.cancel', 'Cancel')}
						onClick={cancel}
					/>
				) : undefined
			}
		>
			{children}
		</Modal>
	);
};
