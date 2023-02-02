/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Container, Icon, Text } from '@zextras/carbonio-design-system';
import { PreviewsManagerContext } from '@zextras/carbonio-ui-preview';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { NodeType } from '../../types/graphql/types';
import { getIconByFileType, getPreviewThumbnailSrc } from '../../utils/utils';

const ImgContainer = styled(Container)`
	overflow: hidden;
`;

const Img = styled.img`
	cursor: pointer;
	border-radius: 0.125rem;
	align-self: center;
`;

interface DisplayerPreviewProps {
	id: string;
	type: NodeType;
	mimeType: string | undefined;
	version: number | undefined;
}

export const DisplayerPreview: React.VFC<DisplayerPreviewProps> = ({
	id,
	type,
	mimeType,
	version
}) => {
	const previewContainerRef = useRef<HTMLDivElement>(null);
	const { openPreview } = useContext(PreviewsManagerContext);
	const [t] = useTranslation();
	const previewHeight = useMemo(() => Math.ceil(window.innerHeight / 3), []);
	const [loading, setLoading] = useState(true);
	const imgRef = useRef<HTMLImageElement>(null);
	const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined);
	const lastSuccessfulSrcRef = useRef<string | undefined>(undefined);
	const currentSrcRef = useRef<string | undefined>(undefined);
	const [error, setError] = useState(false);

	useEffect(() => {
		// reset states on id change
		setLoading(true);
		setPreviewSrc(undefined);
		setError(false);
		currentSrcRef.current = undefined;
		lastSuccessfulSrcRef.current = undefined;
	}, [id]);

	const openPreviewCallback = useCallback(() => {
		openPreview(id);
	}, [id, openPreview]);

	const buildPreviewSrc = useCallback(() => {
		if (previewContainerRef.current) {
			const src = getPreviewThumbnailSrc(
				id,
				version,
				type,
				mimeType,
				previewContainerRef.current.clientWidth,
				previewHeight,
				'rectangular',
				'high',
				'jpeg'
			);
			setPreviewSrc(src);
			currentSrcRef.current = src;
		}
	}, [id, mimeType, previewHeight, type, version]);

	const handleResize = useMemo(
		() =>
			debounce(
				() => {
					setError(false);
					buildPreviewSrc();
				},
				150,
				{ leading: false, trailing: true }
			),
		[buildPreviewSrc]
	);

	useEffect(() => {
		window.addEventListener('resize', handleResize);
		// init state
		handleResize();

		return () => {
			handleResize.cancel();
			window.removeEventListener('resize', handleResize);
		};
	}, [handleResize]);

	const onLoadHandler = useCallback(() => {
		setLoading(false);
		setError(false);
		lastSuccessfulSrcRef.current = currentSrcRef.current;
	}, []);

	const onLoadErrorHandler = useCallback(() => {
		setLoading(false);
		// reset preview to last valid src
		currentSrcRef.current = lastSuccessfulSrcRef.current;
		setPreviewSrc(lastSuccessfulSrcRef.current);
		setError(lastSuccessfulSrcRef.current === undefined);
	}, []);

	useEffect(() => {
		const imgElement = imgRef.current;
		if (previewSrc && imgElement) {
			imgElement.addEventListener('load', onLoadHandler);
			imgElement.addEventListener('error', onLoadErrorHandler);
		}
		return () => {
			if (imgElement) {
				imgElement.removeEventListener('load', onLoadHandler);
				imgElement.removeEventListener('error', onLoadErrorHandler);
			}
		};
	}, [previewSrc, onLoadHandler, onLoadErrorHandler]);

	const reloadPreview = useCallback(() => {
		setLoading(true);
		buildPreviewSrc();
	}, [buildPreviewSrc]);

	return (
		<ImgContainer
			ref={previewContainerRef}
			maxWidth="100%"
			height={`${previewHeight}px`}
			mainAlignment="flex-start"
		>
			{previewSrc && (!error || loading) && (
				<Img ref={imgRef} src={previewSrc} alt="" onDoubleClick={openPreviewCallback} />
			)}
			{loading && !error && (
				<Container orientation="vertical" gap="0.5rem">
					<Icon icon="AnimatedLoader" size="large" />
					<Text size="extrasmall" overflow="break-word">
						{t('preview.loading.file', 'Loading file preview, please wait...')}
					</Text>
				</Container>
			)}
			{error && (
				<Container orientation="vertical" gap="0.5rem">
					<Icon icon={getIconByFileType(type, mimeType)} size="large" color="secondary" />
					<Text size="extrasmall" overflow="break-word">
						{loading
							? t('preview.loading.retrying', 'Trying to load the preview...')
							: t(
									'preview.loading.error',
									'An error occurred while loading the preview. Try again.'
							  )}
					</Text>
					{!loading && (
						<Button
							size="small"
							label={t('preview.button.refresh', 'Refresh preview')}
							onClick={reloadPreview}
						/>
					)}
					{loading && <Icon icon="AnimatedLoader" size="large" />}
				</Container>
			)}
		</ImgContainer>
	);
};
