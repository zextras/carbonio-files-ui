/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { AnyFunction, registerFunctions } from '@zextras/carbonio-shell-ui';

import { uploadToTargetModule } from '../carbonio-files-ui-common/utils/utils';
import { FUNCTION_IDS } from '../constants';

export const getUploadToTargetAndGetTargetIdFunction = (): Parameters<
	typeof registerFunctions
>[number] => {
	const uploadToTargetAndGetTargetIdAction = (
		args: Parameters<typeof uploadToTargetModule>[number]
	): ReturnType<typeof uploadToTargetModule> => uploadToTargetModule(args);
	return {
		id: FUNCTION_IDS.UPLOAD_TO_TARGET_AND_GET_TARGET_ID,
		fn: uploadToTargetAndGetTargetIdAction as AnyFunction
	};
};
