/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Button } from '@zextras/carbonio-design-system';
import { BadgeInfo, PrimaryBarComponentProps } from '@zextras/carbonio-shell-ui';
import { find } from 'lodash';
import { useLocation } from 'react-router-dom';

import { BadgeWrap } from './BadgeWrap';
import { uploadVar } from '../carbonio-files-ui-common/apollo/uploadVar';
import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';
import { UploadStatus } from '../carbonio-files-ui-common/types/graphql/client-types';
import { useNavigation } from '../hooks/useNavigation';

export const PrimaryBarElement = ({ active }: PrimaryBarComponentProps): React.JSX.Element => {
	const uploadStatus = useReactiveVar(uploadVar);
	const location = useLocation();
	const lastLocationRef = useRef<string>('');
	const { navigateTo } = useNavigation();
	const uploadsInfo = useMemo(
		() => ({
			isUploadFailed:
				find(uploadStatus, (item) => item.status === UploadStatus.FAILED) !== undefined
		}),
		[uploadStatus]
	);
	const badge: BadgeInfo = {
		show: uploadsInfo.isUploadFailed,
		color: 'error'
	};
	const navigateToFiles = useCallback((): void => {
		navigateTo(lastLocationRef.current);
	}, [navigateTo]);

	useEffect(() => {
		if (active) {
			const lastLocationString = `${location.pathname}${location.search}`.replace(
				`/${FILES_ROUTE}`,
				''
			);
			lastLocationRef.current = lastLocationString;
		}
	}, [active, location]);

	return (
		<BadgeWrap badge={badge}>
			<Button
				icon={'DriveOutline'}
				backgroundColor={active ? 'gray4' : 'gray6'}
				labelColor={active ? 'primary' : 'text'}
				onClick={navigateToFiles}
				size={'large'}
				data-isselected={active}
			/>
		</BadgeWrap>
	);
};
