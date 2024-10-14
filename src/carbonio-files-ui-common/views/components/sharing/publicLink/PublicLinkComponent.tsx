/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
	Button,
	Container,
	DateTimePicker,
	Input,
	Padding,
	Chip,
	Divider,
	Text,
	Tooltip,
	Row,
	useSnackbar,
	InputProps
} from '@zextras/carbonio-design-system';
import { size } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { AccessCodeComponent } from './AccessCodeComponent';
import { useUserInfo } from '../../../../../hooks/useUserInfo';
import { DATE_TIME_FORMAT } from '../../../../constants';
import { PublicLinkRowStatus } from '../../../../types/common';
import { copyToClipboard, formatDate, initExpirationDate } from '../../../../utils/utils';
import { RouteLeavingGuard } from '../../RouteLeavingGuard';

const CustomText = styled(Text)`
	margin-right: 0;
	margin-left: auto;
`;

interface PublicLinkComponentProps {
	id: string;
	description?: string | null;
	accessCode?: string | null;
	url?: string | null;
	status: PublicLinkRowStatus;
	expiresAt?: number | null;
	onEdit: (linkId: string) => void;
	onEditConfirm: (linkId: string, description?: string, expiresAt?: number) => Promise<unknown>;
	onUndo: () => void;
	onRevokeOrRemove: (linkId: string, isRevoke: boolean) => void;
	forceUrlCopyDisabled: boolean;
	linkName: string;
	isFolder: boolean;
}

export const PublicLinkComponent: React.FC<PublicLinkComponentProps> = ({
	id,
	description,
	accessCode,
	url,
	status,
	expiresAt,
	onEdit,
	onEditConfirm,
	onUndo,
	onRevokeOrRemove,
	forceUrlCopyDisabled,
	linkName,
	isFolder
}) => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const { locale } = useUserInfo();

	const isExpired = useMemo(() => (expiresAt ? Date.now() > expiresAt : false), [expiresAt]);

	const [linkDescriptionValue, setLinkDescriptionValue] = useState<string>(description ?? '');

	const moreThan300Characters = useMemo(
		() => linkDescriptionValue != null && linkDescriptionValue.length > 300,
		[linkDescriptionValue]
	);

	const linkDescriptionOnChange = useCallback<NonNullable<InputProps['onChange']>>((ev) => {
		setLinkDescriptionValue(ev.target.value);
	}, []);

	const initialDate = useMemo(() => (expiresAt ? new Date(expiresAt) : undefined), [expiresAt]);

	const [date, setDate] = useState(initialDate);
	const [updatedTimestamp, setUpdatedTimestamp] = useState(expiresAt);

	const isSomethingChanged = useMemo(
		() =>
			(expiresAt !== updatedTimestamp && (expiresAt != null || updatedTimestamp != null)) ||
			size(description) !== size(linkDescriptionValue),
		[description, expiresAt, linkDescriptionValue, updatedTimestamp]
	);

	const handleChange = useCallback((newDate: Date | null) => {
		setDate(newDate ?? undefined);
		const expirationDate = initExpirationDate(newDate);
		setUpdatedTimestamp(expirationDate?.getTime());
	}, []);

	const onEditCallback = useCallback(() => {
		onEdit(id);
	}, [id, onEdit]);

	const onUndoCallback = useCallback(() => {
		setLinkDescriptionValue(description ?? '');
		setDate(initialDate);
		setUpdatedTimestamp(expiresAt);
		onUndo();
	}, [description, expiresAt, initialDate, onUndo]);

	const onRevokeOrRemoveCallback = useCallback(() => {
		onRevokeOrRemove(id, !isExpired);
	}, [id, onRevokeOrRemove, isExpired]);

	const onEditConfirmCallback = useCallback(
		() =>
			Promise.allSettled([
				onEditConfirm(
					id,
					linkDescriptionValue,
					updatedTimestamp !== expiresAt ? updatedTimestamp ?? 0 : undefined
				)
			]),
		[expiresAt, id, linkDescriptionValue, onEditConfirm, updatedTimestamp]
	);

	const copyUrl = useCallback(() => {
		copyToClipboard(url as string).then(() => {
			createSnackbar({
				key: new Date().toLocaleString(),
				severity: 'info',
				label: t('snackbar.publicLink.copyLink', '{{linkName}} copied', { replace: { linkName } }),
				replace: true,
				hideButton: true
			});
		});
	}, [createSnackbar, t, url, linkName]);

	const [pickerIsOpen, setPickerIsOpen] = useState(false);

	const handleCalendarOpen = useCallback(() => {
		setPickerIsOpen(true);
	}, []);

	const handleCalendarClose = useCallback(() => {
		setPickerIsOpen(false);
	}, []);

	const expirationText = useMemo(() => {
		if (expiresAt) {
			const expirationDateStr = formatDate(expiresAt, locale, DATE_TIME_FORMAT);
			if (!isExpired) {
				return `${t('publicLink.link.expireOn', 'Expires on:')} ${expirationDateStr}`;
			}
			return `${t('publicLink.link.expiredOn', 'This link has expired on:')} ${expirationDateStr}`;
		}
		return t('publicLink.link.noExpirationDate', 'Has no expiration date');
	}, [expiresAt, isExpired, locale, t]);

	return (
		<Container>
			<RouteLeavingGuard
				when={isSomethingChanged}
				onSave={onEditConfirmCallback}
				dataHasError={moreThan300Characters}
			>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line1', 'Do you want to leave the page without saving?')}
				</Text>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost.')}
				</Text>
			</RouteLeavingGuard>
			<Padding vertical="small" />
			<Container orientation="horizontal" mainAlignment="space-between">
				<Chip
					label={
						<Tooltip
							label={
								isExpired
									? t('publicLink.link.urlChip.tooltip.expired', 'This link has expired')
									: t('publicLink.link.urlChip.tooltip.copy', 'Copy {{linkName}}', {
											replace: { linkName }
										})
							}
							maxWidth="unset"
							placement="top"
							disabled={forceUrlCopyDisabled && !isExpired}
						>
							<Row wrap="nowrap" minWidth={0}>
								<Text size="small" weight="light">
									{url}
								</Text>
							</Row>
						</Tooltip>
					}
					hasAvatar={false}
					onClick={forceUrlCopyDisabled || isExpired ? undefined : copyUrl}
					disabled={forceUrlCopyDisabled || isExpired}
					minWidth={0}
					maxWidth="100%"
				/>
				<Container orientation="horizontal" width="fit" padding={{ left: 'large' }} flexShrink={0}>
					{status === PublicLinkRowStatus.OPEN && (
						<>
							<Button
								size="small"
								type="outlined"
								color="secondary"
								label={t('publicLink.link.undo', 'Undo')}
								onClick={onUndoCallback}
							/>
							<Padding right="small" />
							<Button
								size="small"
								type="outlined"
								color="secondary"
								label={t('publicLink.link.editLink', 'Edit Link')}
								onClick={onEditConfirmCallback}
								disabled={moreThan300Characters || !isSomethingChanged}
							/>
						</>
					)}
					{status !== PublicLinkRowStatus.OPEN && (
						<>
							<Button
								disabled={status === PublicLinkRowStatus.DISABLED}
								size="small"
								type="outlined"
								color="error"
								label={
									!isExpired
										? t('publicLink.link.revoke', 'Revoke')
										: t('publicLink.link.remove', 'Remove')
								}
								icon={!isExpired ? 'SlashOutline' : 'DeletePermanentlyOutline'}
								onClick={onRevokeOrRemoveCallback}
							/>
							<Padding right="small" />
							<Button
								disabled={status === PublicLinkRowStatus.DISABLED}
								size="small"
								type="outlined"
								color="secondary"
								label={t('publicLink.link.edit', 'Edit')}
								icon="Edit2Outline"
								onClick={onEditCallback}
							/>
						</>
					)}
				</Container>
			</Container>
			<Padding vertical="small" />
			{status === PublicLinkRowStatus.OPEN && (
				<>
					<Input
						backgroundColor="gray5"
						label={t('publicLink.input.label', "Link's description")}
						value={linkDescriptionValue}
						onChange={linkDescriptionOnChange}
						hasError={moreThan300Characters}
					/>
					{moreThan300Characters && (
						<Row width="fill" mainAlignment="flex-start" padding={{ top: 'small' }}>
							<Text size="small" color="error">
								{t(
									'publicLink.input.description.error.maxLengthAllowed',
									'Maximum length allowed is 300 characters'
								)}
							</Text>
						</Row>
					)}
					<Padding vertical="small" />
					<DateTimePicker
						width="fill"
						label={t('publicLink.dateTimePicker.label', 'Expiration date')}
						includeTime={false}
						enableChips
						dateFormat="P"
						chipProps={{ hasAvatar: false }}
						onChange={handleChange}
						defaultValue={date}
						onCalendarClose={handleCalendarClose}
						onCalendarOpen={handleCalendarOpen}
						minDate={new Date()}
						popperPlacement="bottom-end"
					/>
					{(date || pickerIsOpen) && (
						<Row width="fill" mainAlignment="flex-start" padding={{ top: 'small' }}>
							<Text size="small" color="secondary">
								{t(
									'publicLink.datePickerInput.description',
									'The link expires at the end of the chosen day'
								)}
							</Text>
						</Row>
					)}
				</>
			)}

			{status !== PublicLinkRowStatus.OPEN && (
				<>
					<Container orientation="horizontal" mainAlignment="space-between" wrap="wrap">
						<Text overflow="break-word" color="gray1" size="small" disabled={isExpired}>
							{description}
						</Text>
						<CustomText color="gray1" size="small">
							{expirationText}
						</CustomText>
					</Container>
					{accessCode && <AccessCodeComponent accessCode={accessCode} />}
				</>
			)}
			<Padding vertical="small" />
			<Divider color="gray2" />
		</Container>
	);
};
