/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useEffect, useState, useMemo } from 'react';

import { Modal, Button } from '@zextras/carbonio-design-system';
import type { Location } from 'history';
import { filter } from 'lodash';
import { useTranslation } from 'react-i18next';
import { Prompt, useHistory } from 'react-router-dom';

type RouteLeavingGuardProps = React.PropsWithChildren<{
	when?: boolean;
	onSave: () => Promise<PromiseSettledResult<Awaited<unknown>>[]>;
	dataHasError?: boolean;
}>;
export const RouteLeavingGuard = ({
	children,
	when,
	onSave,
	dataHasError = false
}: RouteLeavingGuardProps): React.JSX.Element => {
	const history = useHistory();
	const lastLocationInitial = useMemo(() => history.location, [history]);
	const [modalVisible, setModalVisible] = useState(false);
	const [lastLocation, setLastLocation] = useState<Location>(lastLocationInitial);
	const [confirmedNavigation, setConfirmedNavigation] = useState(false);
	const [t] = useTranslation();
	const cancel = (): void => {
		setModalVisible(false);
		setConfirmedNavigation(false);
	};

	const handleBlockedNavigation = (nextLocation: Location): boolean => {
		if (
			!confirmedNavigation &&
			`${nextLocation.pathname}${nextLocation.search || ''}` !==
				`${history.location.pathname}${history.location.search}`
		) {
			setModalVisible(true);
			setLastLocation(nextLocation);
			return false;
		}
		return true;
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
					setModalVisible(false);
					setConfirmedNavigation(true);
				}
			})
			.catch((reason) => {
				console.error(reason);
				cancel();
			});
	};

	const onSecondaryAction = (): void => {
		setModalVisible(false);
		setConfirmedNavigation(true);
	};

	useEffect(() => {
		if (confirmedNavigation && lastLocation) {
			// Navigate to the previous blocked location with your navigate function
			history.push(lastLocation);
		}
	}, [confirmedNavigation, history, lastLocation]);

	return (
		<>
			<Prompt when={when} message={handleBlockedNavigation} />
			{/* Your own alert/dialog/modal component */}
			<Modal
				showCloseIcon
				closeIconTooltip={t('modal.close.tooltip', 'Close')}
				open={modalVisible}
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
		</>
	);
};
