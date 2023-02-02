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
	useSnackbar
} from '@zextras/carbonio-design-system';
import { size } from 'lodash';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import useUserInfo from '../../../../../hooks/useUserInfo';
import { PublicLinkRowStatus } from '../../../../types/common';
import { copyToClipboard, formatDate } from '../../../../utils/utils';
import { RouteLeavingGuard } from '../../RouteLeavingGuard';

const CustomText = styled(Text)`
	margin-right: 0;
	margin-left: auto;
`;

interface PublicLinkComponentProps {
	id: string;
	description?: string | null;
	url?: string | null;
	status: PublicLinkRowStatus;
	expiresAt?: number | null;
	onEdit: (linkId: string) => void;
	onEditConfirm: (linkId: string, description?: string, expiresAt?: number) => Promise<unknown>;
	onUndo: () => void;
	onRevokeOrRemove: (linkId: string, isRevoke: boolean) => void;
	forceUrlCopyDisabled: boolean;
}

export const PublicLinkComponent: React.FC<PublicLinkComponentProps> = ({
	id,
	description,
	url,
	status,
	expiresAt,
	onEdit,
	onEditConfirm,
	onUndo,
	onRevokeOrRemove,
	forceUrlCopyDisabled
}) => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const { zimbraPrefTimeZoneId } = useUserInfo();

	const isExpired = useMemo(() => (expiresAt ? Date.now() > expiresAt : false), [expiresAt]);

	const [linkDescriptionValue, setLinkDescriptionValue] = useState<string>(description || '');

	const moreThan300Characters = useMemo(
		() => linkDescriptionValue != null && linkDescriptionValue.length > 300,
		[linkDescriptionValue]
	);

	const linkDescriptionOnChange = useCallback((ev) => {
		setLinkDescriptionValue(ev.target.value);
	}, []);

	const initialMomentDate = useMemo(() => {
		if (expiresAt) {
			const momentDate = moment(expiresAt).tz(zimbraPrefTimeZoneId);
			return new Date(momentDate.year(), momentDate.month(), momentDate.date());
		}
		return undefined;
	}, [expiresAt, zimbraPrefTimeZoneId]);

	const [date, setDate] = useState(initialMomentDate);
	const [updatedTimestamp, setUpdatedTimestamp] = useState(expiresAt);

	const isSomethingChanged = useMemo(
		() =>
			(expiresAt !== updatedTimestamp && (expiresAt != null || updatedTimestamp != null)) ||
			size(description) !== size(linkDescriptionValue),
		[description, expiresAt, linkDescriptionValue, updatedTimestamp]
	);

	const handleChange = useCallback((d: Date | null) => {
		if (d === null) {
			setDate(undefined);
			setUpdatedTimestamp(undefined);
		} else {
			const userTimezoneOffset = d.getTimezoneOffset() * 60000;
			const epoch = d.getTime() - userTimezoneOffset;
			// add 23 hours and 59 minutes
			const epochPlusOneDay = epoch + 24 * 60 * 60 * 1000 - 60000;
			setUpdatedTimestamp(epochPlusOneDay);
			setDate(d);
		}
	}, []);

	const onEditCallback = useCallback(() => {
		onEdit(id);
	}, [id, onEdit]);

	const onUndoCallback = useCallback(() => {
		setLinkDescriptionValue(description || '');
		setDate(initialMomentDate);
		setUpdatedTimestamp(expiresAt);
		onUndo();
	}, [description, expiresAt, initialMomentDate, onUndo]);

	const onRevokeOrRemoveCallback = useCallback(() => {
		onRevokeOrRemove(id, !isExpired);
	}, [id, onRevokeOrRemove, isExpired]);

	const onEditConfirmCallback = useCallback(
		() =>
			Promise.allSettled([
				onEditConfirm(
					id,
					linkDescriptionValue,
					updatedTimestamp !== expiresAt ? updatedTimestamp || 0 : undefined
				)
			]),
		[expiresAt, id, linkDescriptionValue, onEditConfirm, updatedTimestamp]
	);

	const copyUrl = useCallback(
		(_event) => {
			copyToClipboard(url as string).then(() => {
				createSnackbar({
					key: new Date().toLocaleString(),
					type: 'info',
					label: t('snackbar.publicLink.copyLink', 'Public link copied'),
					replace: true,
					hideButton: true
				});
			});
		},
		[createSnackbar, t, url]
	);

	const [pickerIsOpen, setPickerIsOpen] = useState(false);

	const handleCalendarOpen = useCallback(() => {
		setPickerIsOpen(true);
	}, []);

	const handleCalendarClose = useCallback(() => {
		setPickerIsOpen(false);
	}, []);

	const expirationText = useMemo(() => {
		if (expiresAt) {
			const expirationDateStr = formatDate(expiresAt, 'DD/MM/YY HH:mm', zimbraPrefTimeZoneId);
			if (!isExpired) {
				return `${t('publicLink.link.expireOn', 'Expires on:')} ${expirationDateStr}`;
			}
			return `${t('publicLink.link.expiredOn', 'This link has expired on:')} ${expirationDateStr}`;
		}
		return t('publicLink.link.noExpirationDate', 'Has no expiration date');
	}, [expiresAt, isExpired, t, zimbraPrefTimeZoneId]);

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
					{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost')}
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
									: t('publicLink.link.urlChip.tooltip.copy', 'Copy public link')
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
						label={t('publicLink.dateTimePicker.label', 'Expiration Date')}
						includeTime={false}
						enableChips
						dateFormat="dd/MM/yyyy"
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
				<Container orientation="horizontal" mainAlignment="space-between" wrap="wrap">
					<Text overflow="break-word" color="gray1" size="small" disabled={isExpired}>
						{description}
					</Text>
					<CustomText color="gray1" size="small">
						{expirationText}
					</CustomText>
				</Container>
			)}
			<Padding vertical="small" />
			<Divider color="gray2" />
		</Container>
	);
};
