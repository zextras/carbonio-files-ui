/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Button, Container, Padding, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

interface ModalFooterCustomProps {
	confirmLabel: string;
	confirmHandler: (event: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => void;
	confirmDisabled?: boolean;
	confirmDisabledTooltip?: string;
	confirmLoading?: boolean;
	cancelLabel?: string;
	cancelHandler?: (event: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => void;
	cancelDisabled?: boolean;
	cancelLoading?: boolean;
	cancelButtonColor?: string;
	children?: React.ReactNode;
}

export const ModalFooterCustom = React.forwardRef<HTMLDivElement, ModalFooterCustomProps>(
	function ModalFooterCustomFn(
		{
			confirmLabel,
			confirmHandler,
			confirmDisabled,
			confirmDisabledTooltip,
			confirmLoading,
			cancelLabel,
			cancelHandler,
			cancelDisabled,
			cancelButtonColor,
			cancelLoading,
			children
		},
		ref
	) {
		const [t] = useTranslation();

		return (
			<Container
				orientation="horizontal"
				mainAlignment="flex-end"
				crossAlignment="flex-end"
				height="auto"
				wrap="wrap"
				ref={ref}
			>
				{children}
				{cancelHandler && (
					<Padding left="small">
						<Button
							color={cancelButtonColor || 'primary'}
							type="outlined"
							onClick={cancelHandler}
							label={cancelLabel || t('modal.button.cancel')}
							disabled={cancelDisabled}
							loading={cancelLoading}
						/>
					</Padding>
				)}
				<Padding left="small">
					<Tooltip
						label={confirmDisabledTooltip}
						disabled={!confirmDisabledTooltip || !confirmDisabled}
					>
						<Button
							color="primary"
							onClick={confirmHandler}
							label={confirmLabel}
							disabled={confirmDisabled}
							loading={confirmLoading}
						/>
					</Tooltip>
				</Padding>
			</Container>
		);
	}
);
