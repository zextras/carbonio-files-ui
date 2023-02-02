/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	ChipInput,
	ChipInputProps,
	ChipItem,
	Container,
	CustomModal,
	Divider,
	ModalBody,
	ModalFooter,
	ModalHeader,
	Row
} from '@zextras/carbonio-design-system';
import { isEmpty, map, isEqual, every, isArray } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { useActiveNode } from '../../../hooks/useActiveNode';
import { ROOTS } from '../../constants';
import { useDestinationVarManager } from '../../hooks/useDestinationVarManager';
import { AdvancedFilters, NodeListItemType } from '../../types/common';
import { Folder } from '../../types/graphql/types';
import { AdvancedSwitch } from './AdvancedSwitch';
import { FolderSelectionModalContent } from './FolderSelectionModalContent';
import { ItemTypeChipInput } from './ItemTypeChipInput';
import { ModalFooterCustom } from './ModalFooterCustom';
import { OwnerChipInput } from './OwnerChipInput';

const FolderChipInput = styled(ChipInput)`
	cursor: pointer;
	input {
		cursor: pointer;
	}
`;

interface AdvancedSearchModalContentProps {
	filters: AdvancedFilters;
	closeAction: () => void;
	searchAdvancedFilters: (advancedFilters: AdvancedFilters) => void;
}

export const AdvancedSearchModalContent: React.VFC<AdvancedSearchModalContentProps> = ({
	filters,
	closeAction,
	searchAdvancedFilters
}) => {
	const { activeNodeId, removeActiveNode } = useActiveNode();
	const [t] = useTranslation();
	const [currentFilters, setCurrentFilters] = useState<AdvancedFilters>(filters);
	const [keywordsHasTextContent, setKeywordsHasTextContent] = useState<boolean>(false);
	const folderChipInputRef = useRef<HTMLInputElement>(null);
	const { resetAll, resetCurrent } = useDestinationVarManager<Pick<
		NodeListItemType,
		'id' | 'name'
	> | null>();

	const keywords = useMemo<ChipItem[]>(() => {
		if (currentFilters.keywords) {
			return map(currentFilters.keywords, (k) => ({
				...k,
				background: 'gray2'
			}));
		}
		return [];
	}, [currentFilters.keywords]);

	const folderId = useMemo<ChipItem[]>(() => {
		if (currentFilters.folderId) {
			return [{ ...currentFilters.folderId, background: 'gray2' }];
		}
		return [];
	}, [currentFilters.folderId]);

	const searchDisabled = useMemo(
		() =>
			(isEmpty(currentFilters) ||
				every(currentFilters, (filter) => isEmpty(filter)) ||
				isEqual(currentFilters, filters)) &&
			!keywordsHasTextContent,
		[currentFilters, filters, keywordsHasTextContent]
	);

	const confirmHandler = useCallback(() => {
		searchAdvancedFilters(currentFilters);
		if (activeNodeId) {
			removeActiveNode();
		}
		closeAction();
	}, [activeNodeId, closeAction, currentFilters, removeActiveNode, searchAdvancedFilters]);

	const closeHandler = useCallback(() => {
		closeAction();
	}, [closeAction]);

	const resetFilters = useCallback(() => {
		setCurrentFilters({});
	}, []);

	const updateFilter = useCallback(
		(key: keyof AdvancedFilters, value: AdvancedFilters[typeof key] | undefined) => {
			// if the filter is not set, delete the field from the filters
			if (isEmpty(value)) {
				setCurrentFilters((prevState) => {
					const newState = { ...prevState };
					delete newState[key];
					return newState;
				});
			} else {
				setCurrentFilters((prevState) => ({ ...prevState, [key]: value }));
			}
		},
		[]
	);

	const keywordsOnChange = useCallback(
		(newKeywords: ChipItem[]) => {
			// FIXME: fix types
			updateFilter('keywords', newKeywords as AdvancedFilters['keywords']);
			setKeywordsHasTextContent(false);
		},
		[updateFilter]
	);

	const keywordsOnAdd = useCallback<NonNullable<ChipInputProps['onAdd']>>(
		(keyword: string | unknown) => {
			if (typeof keyword === 'string') {
				return {
					label: keyword,
					hasAvatar: false,
					value: keyword
				};
			}
			throw new Error('invalid keywords received');
		},
		[]
	);

	const keywordsOnType = useCallback<NonNullable<ChipInputProps['onInputType']>>(
		({ textContent }) => {
			setKeywordsHasTextContent(!isEmpty(textContent));
		},
		[]
	);

	const flaggedOnChange = useCallback(
		(newValue) => {
			updateFilter(
				'flagged',
				newValue
					? {
							label: t('search.advancedSearch.modal.flagged.label', 'Flagged'),
							avatarIcon: 'Flag',
							avatarBackground: 'error',
							value: true
					  }
					: undefined
			);
		},
		[t, updateFilter]
	);

	const sharedOnChange = useCallback(
		(newValue) => {
			updateFilter(
				'sharedByMe',
				newValue
					? {
							label: t('search.advancedSearch.modal.shared.label', 'Shared'),
							avatarIcon: 'Share',
							avatarBackground: 'secondary',
							value: true
					  }
					: undefined
			);
		},
		[t, updateFilter]
	);

	const folderOnChange = useCallback(
		(folder: Pick<Folder, 'id' | 'name'> | ChipItem[], cascade?: boolean) => {
			if (!isArray(folder) && !isEmpty(folder)) {
				updateFilter('folderId', {
					/* i18next-extract-disable-next-line */
					label: `${cascade ? 'under' : 'in'}:${t('node.alias.name', folder.name, {
						context: folder.id
					})}`,
					avatarIcon: 'Folder',
					avatarBackground: 'secondary',
					onClick: (event) => {
						event.stopPropagation();
					},
					value: (folder.id !== ROOTS.SHARED_WITH_ME && folder.id) || undefined
				});
				updateFilter(
					'sharedWithMe',
					(folder.id === ROOTS.LOCAL_ROOT && { value: false }) ||
						(folder.id === ROOTS.SHARED_WITH_ME && { value: true }) ||
						undefined
				);
				updateFilter('cascade', { value: cascade });
			} else {
				updateFilter('folderId', undefined);
				updateFilter('sharedWithMe', undefined);
				updateFilter('cascade', undefined);
			}
		},
		[t, updateFilter]
	);

	const [folderSelectionModalOpen, setFolderSelectionModalOpen] = useState(false);

	const openFolderSelectionModal = useCallback((event: React.SyntheticEvent) => {
		event.stopPropagation();
		setFolderSelectionModalOpen(true);
	}, []);

	const closeFolderSelectionModal = useCallback(() => {
		resetAll();
		setFolderSelectionModalOpen(false);
	}, [resetAll]);

	const removeFocus = useCallback(() => {
		if (folderChipInputRef.current) {
			folderChipInputRef.current.blur();
		}
	}, []);

	useEffect(() => {
		const folderChipInputInputElement = folderChipInputRef.current;
		if (folderChipInputInputElement) {
			folderChipInputInputElement.addEventListener('focus', removeFocus);
		}
		return () => {
			if (folderChipInputInputElement) {
				folderChipInputInputElement.removeEventListener('focus', removeFocus);
			}
		};
	}, [openFolderSelectionModal, removeFocus]);

	return (
		<>
			<ModalHeader
				title={t('search.advancedSearch.modal.title', 'Advanced Filters')}
				onClose={closeHandler}
				showCloseIcon
				closeIconTooltip={t('modal.close.tooltip', 'Close')}
			/>
			<Divider />
			<ModalBody>
				<Row takeAvailableSpace wrap="nowrap" width="fill" crossAlignment="flex-start">
					<AdvancedSwitch
						label={t('search.advancedSearch.modal.flagged.label', 'Flagged')}
						description={t(
							'search.advancedSearch.modal.flagged.description',
							"Filter the results by items that you've flagged"
						)}
						onChange={flaggedOnChange}
						initialValue={!!currentFilters.flagged}
					/>
					<AdvancedSwitch
						label={t('search.advancedSearch.modal.shared.label', 'Shared')}
						description={t(
							'search.advancedSearch.modal.shared.description',
							'Filter the results by items that contain at least one collaborator besides you'
						)}
						onChange={sharedOnChange}
						initialValue={!!currentFilters.sharedByMe}
					/>
				</Row>
				<Row
					takeAvailableSpace
					wrap="nowrap"
					width="fill"
					padding={{ all: 'extrasmall' }}
					gap="0.5rem"
				>
					<Container maxWidth={'50%'}>
						<ChipInput
							placeholder={t('search.advancedSearch.modal.keywords.label', 'Keywords')}
							background="gray5"
							value={keywords}
							onChange={keywordsOnChange}
							onAdd={keywordsOnAdd}
							separators={[',', ';', 'Enter']}
							onInputType={keywordsOnType}
							confirmChipOnSpace={false}
						/>
					</Container>
					<Container maxWidth={'50%'}>
						<OwnerChipInput currentFilters={currentFilters} updateFilter={updateFilter} />
					</Container>
				</Row>
				<Row
					takeAvailableSpace
					wrap="nowrap"
					width="fill"
					padding={{ all: 'extrasmall' }}
					gap="0.5rem"
				>
					<Container maxWidth={'50%'}>
						<ItemTypeChipInput currentFilters={currentFilters} updateFilter={updateFilter} />
					</Container>
					<Container maxWidth={'50%'}>
						<FolderChipInput
							placeholder={t('search.advancedSearch.modal.folder.label', 'Select a folder')}
							background="gray5"
							value={folderId}
							icon="FolderOutline"
							onClick={openFolderSelectionModal}
							iconAction={openFolderSelectionModal}
							maxChips={1}
							onChange={folderOnChange}
							inputRef={folderChipInputRef}
						/>
					</Container>
				</Row>
			</ModalBody>
			<Divider />
			<ModalFooter
				customFooter={
					<ModalFooterCustom
						confirmHandler={confirmHandler}
						confirmDisabled={searchDisabled}
						confirmLabel={t('search.advancedSearch.modal.button.confirm', 'Search')}
						cancelHandler={resetFilters}
						cancelLabel={t('search.advancedSearch.modal.button.reset', 'Reset filters')}
					/>
				}
			/>
			<CustomModal
				minHeight="32rem"
				maxHeight="60vh"
				onClose={closeFolderSelectionModal}
				open={folderSelectionModalOpen}
				onClick={resetCurrent}
			>
				<FolderSelectionModalContent
					folderId={
						currentFilters.folderId?.value ||
						(currentFilters.sharedWithMe?.value && ROOTS.SHARED_WITH_ME) ||
						undefined
					}
					cascadeDefault={currentFilters.cascade?.value || undefined}
					confirmAction={folderOnChange}
					closeAction={closeFolderSelectionModal}
				/>
			</CustomModal>
		</>
	);
};
