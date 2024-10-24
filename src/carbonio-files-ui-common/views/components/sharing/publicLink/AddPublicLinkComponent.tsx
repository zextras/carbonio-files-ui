/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	Button,
	Container,
	DateTimePicker,
	Input,
	Padding,
	Text,
	Row,
	DateTimePickerProps,
	InputProps
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { PublicLinkRowStatus } from '../../../../types/common';
import { initExpirationDate } from '../../../../utils/utils';
import { RouteLeavingGuard } from '../../RouteLeavingGuard';
import { TextWithLineHeight } from '../../StyledComponents';

interface AddPublicLinkComponentProps {
	status: PublicLinkRowStatus;
	onAddLink: () => void;
	onUndo: () => void;
	onGenerate: (linkDescriptionValue: string, date: Date | undefined) => Promise<unknown>;
	limitReached: boolean;
	linkTitle: string;
	linkDescription: string;
}

export const AddPublicLinkComponent = ({
	status,
	onAddLink,
	onUndo,
	onGenerate,
	limitReached,
	linkTitle,
	linkDescription
}: AddPublicLinkComponentProps): React.JSX.Element => {
	const [t] = useTranslation();
	const scrollToElementRef = useRef<HTMLElement>(null);

	const [linkDescriptionValue, setLinkDescriptionValue] = useState('');

	const moreThan300Characters = useMemo(
		() => linkDescriptionValue != null && linkDescriptionValue.length > 300,
		[linkDescriptionValue]
	);

	const linkDescriptionOnChange = useCallback<NonNullable<InputProps['onChange']>>((ev) => {
		setLinkDescriptionValue(ev.target.value);
	}, []);

	const [date, setDate] = useState<Date | undefined>(undefined);

	const isSomethingChanged = useMemo(
		() => date != null || linkDescriptionValue.length > 0,
		[date, linkDescriptionValue.length]
	);

	const handleChange = useCallback<NonNullable<DateTimePickerProps['onChange']>>(
		(newDate: Date | null) => {
			setDate(newDate ?? undefined);
		},
		[]
	);

	const onGenerateCallback = useCallback(() => {
		const expirationDate = initExpirationDate(date);
		return Promise.allSettled([
			onGenerate(linkDescriptionValue, expirationDate).then(() => {
				setLinkDescriptionValue('');
				setDate(undefined);
			})
		]);
	}, [date, linkDescriptionValue, onGenerate]);

	const onUndoCallback = useCallback(() => {
		onUndo();
		setLinkDescriptionValue('');
		setDate(undefined);
	}, [onUndo]);

	const [pickerIsOpen, setPickerIsOpen] = useState(false);

	const handleCalendarOpen = useCallback(() => {
		setPickerIsOpen(true);
	}, []);

	const handleCalendarClose = useCallback(() => {
		setPickerIsOpen(false);
	}, []);

	useEffect(() => {
		if (status === PublicLinkRowStatus.OPEN && scrollToElementRef?.current) {
			const rect = scrollToElementRef.current.getBoundingClientRect();
			if (rect.top > window.document.documentElement.clientHeight) {
				scrollToElementRef.current.scrollIntoView({ block: 'end' });
			}
		}
	}, [status]);

	return (
		<Container>
			<RouteLeavingGuard
				when={isSomethingChanged}
				onSave={onGenerateCallback}
				dataHasError={moreThan300Characters}
			>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line1', 'Do you want to leave the page without saving?')}
				</Text>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost.')}
				</Text>
			</RouteLeavingGuard>
			<Container orientation="horizontal" mainAlignment="space-between">
				<Container
					mainAlignment="flex-start"
					crossAlignment="flex-start"
					height="fit"
					background="gray6"
					width="fit"
				>
					<TextWithLineHeight size="medium">{linkTitle}</TextWithLineHeight>
					<TextWithLineHeight size="extrasmall" color="secondary" overflow="break-word">
						{linkDescription}
					</TextWithLineHeight>
				</Container>
				{limitReached && (
					<Text size="small" color="secondary">
						{t(
							'publicLink.addLink.limitReached',
							'The maximum amount of public links has been reached'
						)}
					</Text>
				)}
				{!limitReached && (
					<Container orientation="horizontal" width="fit">
						{status === PublicLinkRowStatus.OPEN && (
							<>
								<Button
									size="small"
									type="outlined"
									color="secondary"
									label={t('publicLink.addLink.undo', 'Undo')}
									onClick={onUndoCallback}
								/>
								<Padding right="small" />
								<Button
									size="small"
									type="outlined"
									label={t('publicLink.addLink.generateLink', 'Generate Link')}
									onClick={onGenerateCallback}
									disabled={moreThan300Characters}
								/>
							</>
						)}
						{status !== PublicLinkRowStatus.OPEN && (
							<Button
								disabled={status === PublicLinkRowStatus.DISABLED}
								size="small"
								type="outlined"
								label={t('publicLink.addLink.addLink', 'Add Link')}
								onClick={onAddLink}
							/>
						)}
					</Container>
				)}
			</Container>
			{status === PublicLinkRowStatus.OPEN && (
				<>
					<Padding vertical="small" />
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
						onCalendarClose={handleCalendarClose}
						onCalendarOpen={handleCalendarOpen}
						minDate={new Date()}
						popperPlacement="bottom-end"
						defaultValue={date}
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
					<span ref={scrollToElementRef} />
				</>
			)}
		</Container>
	);
};
