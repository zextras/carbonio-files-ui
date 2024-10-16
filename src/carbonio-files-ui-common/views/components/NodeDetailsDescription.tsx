/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
	Container,
	Padding,
	Row,
	Text,
	Input,
	Tooltip,
	Button
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { RouteLeavingGuard } from './RouteLeavingGuard';
import { ItalicText, ShimmerText } from './StyledComponents';
import { useUpdateNodeDescriptionMutation } from '../../hooks/graphql/mutations/useUpdateNodeDescriptionMutation';

interface NodeDetailsDescriptionProps {
	description: string | undefined;
	canUpsertDescription: boolean;
	id: string;
	loading?: boolean;
}

const Label = ({ children }: React.PropsWithChildren): React.JSX.Element => (
	<Padding bottom="small">
		<Text color="secondary" size="small">
			{children}
		</Text>
	</Padding>
);

const CustomIconButton = styled(Button)`
	outline: none;
`;

const CustomItalicText = styled(ItalicText)`
	user-select: none;
`;

export const NodeDetailsDescription = ({
	description = '',
	canUpsertDescription,
	id,
	loading
}: NodeDetailsDescriptionProps): React.JSX.Element => {
	const [t] = useTranslation();
	const [editingDescription, setEditingDescription] = useState(false);
	const { updateNodeDescription } = useUpdateNodeDescriptionMutation();

	const [descriptionValue, setDescriptionValue] = useState(description);

	useEffect(() => {
		setDescriptionValue(description);
	}, [description]);

	const isDescriptionChanged = useMemo(
		() => editingDescription && descriptionValue !== description,
		[description, descriptionValue, editingDescription]
	);

	const moreThan4096Characters = useMemo(
		() => descriptionValue != null && descriptionValue.length > 4096,
		[descriptionValue]
	);

	const changeDescription = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
		({ target: { value } }) => {
			setDescriptionValue(value);
		},
		[]
	);

	const openEdit = useCallback(() => {
		setEditingDescription(true);
	}, []);

	const closeEdit = useCallback(() => {
		setEditingDescription(false);
		setDescriptionValue(description);
	}, [description]);

	const save = useCallback(() => {
		if (!moreThan4096Characters) {
			setEditingDescription(false);
			if (description !== descriptionValue) {
				const promise = updateNodeDescription(id, descriptionValue).catch((reason) => {
					setEditingDescription(true);
					throw reason;
				});
				return Promise.allSettled([promise]);
			}
			return Promise.allSettled([Promise.resolve()]);
		}
		return Promise.allSettled([
			Promise.reject(new Error('description is more than 4096 characters'))
		]);
	}, [description, descriptionValue, id, moreThan4096Characters, updateNodeDescription]);

	return (
		<>
			<RouteLeavingGuard
				when={isDescriptionChanged}
				onSave={save}
				dataHasError={moreThan4096Characters}
			>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line1', 'Do you want to leave the page without saving?')}
				</Text>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost.')}
				</Text>
			</RouteLeavingGuard>
			{editingDescription && (
				<Row
					width="fill"
					orientation="vertical"
					crossAlignment="flex-start"
					padding={{ vertical: 'small' }}
				>
					<Row
						mainAlignment="space-between"
						wrap="nowrap"
						width="fill"
						padding={{ vertical: 'small' }}
					>
						<Label>{t('displayer.details.description', 'Description')}</Label>
						<Container orientation="horizontal" mainAlignment="flex-end">
							<Tooltip
								label={t(
									'displayer.details.editDescription.closeIconTooltip',
									'Close without saving'
								)}
							>
								<Button
									type={'ghost'}
									color="secondary"
									size="small"
									icon="Close"
									onClick={closeEdit}
								/>
							</Tooltip>
							<Tooltip
								disabled={!isDescriptionChanged || moreThan4096Characters}
								label={t('displayer.details.editDescription.saveIconTooltip', 'Save edits')}
							>
								<CustomIconButton
									color="secondary"
									type={'ghost'}
									size="small"
									icon="SaveOutline"
									onClick={save}
									disabled={!isDescriptionChanged || moreThan4096Characters}
								/>
							</Tooltip>
						</Container>
					</Row>
					<Input
						backgroundColor="gray5"
						label={t(
							'displayer.details.editDescription.input.label',
							'Maximum length allowed is 4096 characters'
						)}
						value={descriptionValue}
						onChange={changeDescription}
						hasError={moreThan4096Characters}
						data-testid="input-description"
						onEnter={save}
					/>
				</Row>
			)}
			{!editingDescription && (
				<Row
					width="fill"
					orientation="vertical"
					crossAlignment="flex-start"
					padding={{ vertical: 'small' }}
				>
					<Row
						mainAlignment="space-between"
						wrap="nowrap"
						width="fill"
						padding={{ vertical: 'small' }}
					>
						<Label>{t('displayer.details.description', 'Description')}</Label>
						<Tooltip
							label={t('displayer.details.editDescription.editIconTooltip', 'Edit description')}
						>
							<Button
								type={'ghost'}
								color="secondary"
								size="small"
								icon="Edit2Outline"
								onClick={openEdit}
								disabled={!canUpsertDescription || loading}
							/>
						</Tooltip>
					</Row>
					{loading && description === undefined && <ShimmerText $size="medium" width="70%" />}
					{!loading && (
						<Text size="medium" overflow="break-word">
							{description ||
								(canUpsertDescription && (
									<CustomItalicText color="secondary" size="medium" overflow="break-word">
										{t(
											'displayer.details.missingDescription',
											'Click the edit button to add a description'
										)}
									</CustomItalicText>
								))}
						</Text>
					)}
				</Row>
			)}
		</>
	);
};
