/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Padding, Row, Text, TextArea } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { RouteLeavingGuard } from './RouteLeavingGuard';
import { useUpdateNodeDescriptionMutation } from '../../hooks/graphql/mutations/useUpdateNodeDescriptionMutation';

interface NodeDetailsDescriptionProps {
	description: string | undefined;
	canUpsertDescription: boolean;
	id: string;
	loading?: boolean;
}

const DESCRIPTION_MAX_LENGTH = 1024;

const Label = ({ children }: React.PropsWithChildren): React.JSX.Element => (
	<Padding bottom="small">
		<Text color="secondary" size="small">
			{children}
		</Text>
	</Padding>
);

export const NodeDetailsDescription = ({
	description = '',
	canUpsertDescription,
	id,
	loading
}: NodeDetailsDescriptionProps): React.JSX.Element => {
	const [t] = useTranslation();
	const { updateNodeDescription } = useUpdateNodeDescriptionMutation();

	const [descriptionValue, setDescriptionValue] = useState(description);
	const [isFocused, setIsFocused] = useState(false);
	const textAreaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setDescriptionValue(description);
	}, [description]);

	const isDescriptionChanged = useMemo(
		() => descriptionValue !== description,
		[description, descriptionValue]
	);

	const moreThanMaxCharacters = useMemo(
		() => descriptionValue != null && descriptionValue.length > DESCRIPTION_MAX_LENGTH,
		[descriptionValue]
	);

	const changeDescription = useCallback<React.ChangeEventHandler<HTMLTextAreaElement>>(
		({ target: { value } }) => {
			setDescriptionValue(value);
		},
		[]
	);

	const cancel = useCallback(() => {
		setDescriptionValue(description);
	}, [description]);

	const save = useCallback(() => {
		if (!moreThanMaxCharacters) {
			if (description !== descriptionValue) {
				const promise = updateNodeDescription(id, descriptionValue).catch((reason) => {
					throw reason;
				});
				return Promise.allSettled([promise]);
			}
			return Promise.allSettled([Promise.resolve()]);
		}
		return Promise.allSettled([
			Promise.reject(new Error(`description is more than ${DESCRIPTION_MAX_LENGTH} characters`))
		]);
	}, [description, descriptionValue, id, moreThanMaxCharacters, updateNodeDescription]);

	return (
		<>
			<RouteLeavingGuard
				when={isDescriptionChanged}
				onSave={save}
				dataHasError={moreThanMaxCharacters}
			>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line1', 'Do you want to leave the page without saving?')}
				</Text>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost.')}
				</Text>
			</RouteLeavingGuard>
			<Row
				width="fill"
				orientation="vertical"
				crossAlignment="flex-start"
				padding={{ vertical: 'small' }}
			>
				<Label>{t('displayer.details.description', 'Description')}</Label>
				<TextArea
					ref={textAreaRef}
					label={t('displayer.details.description', 'Description')}
					value={descriptionValue}
					onChange={changeDescription}
					onFocus={(): void => setIsFocused(true)}
					onBlur={(): void => setIsFocused(false)}
					hasError={moreThanMaxCharacters}
					data-testid="input-description"
					readOnly={!canUpsertDescription || loading}
					description={
						isFocused
							? t('displayer.details.editDescription.characterLimit', {
									defaultValue: 'Maximum length allowed is {{max}} characters',
									max: DESCRIPTION_MAX_LENGTH
								})
							: undefined
					}
				/>
				{isDescriptionChanged && (
					<Row width="fill" mainAlignment="flex-end" padding={{ top: 'small' }} gap="0.25rem">
						<Button
							type="outlined"
							color="secondary"
							label={t('displayer.details.editDescription.cancel', 'Cancel')}
							onClick={(): void => {
								cancel();
								textAreaRef.current?.querySelector('textarea')?.blur();
							}}
							onMouseDown={(e: React.MouseEvent): void => e.preventDefault()}
						/>
						<Button
							color="primary"
							label={t('displayer.details.editDescription.save', 'Save')}
							onClick={(): void => {
								save();
								textAreaRef.current?.querySelector('textarea')?.blur();
							}}
							disabled={moreThanMaxCharacters}
							onMouseDown={(e: React.MouseEvent): void => e.preventDefault()}
						/>
					</Row>
				)}
			</Row>
		</>
	);
};
