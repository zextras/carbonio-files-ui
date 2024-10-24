/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import i18next, { i18n } from 'i18next';

export default class I18nTestFactory {
	// eslint-disable-next-line class-methods-use-this
	public getAppI18n(): i18n {
		const newI18n = i18next.createInstance();
		newI18n
			// init i18next
			// for all options read: https://www.i18next.com/overview/configuration-options
			.init({
				lng: 'en',
				fallbackLng: 'en',
				debug: false,
				interpolation: {
					escapeValue: false // not needed for react as it escapes by default
				},
				resources: {
					en: {
						translation: {
							errorCode: {
								code: 'Something went wrong',
								code_OVER_QUOTA_REACHED:
									'You have reached your storage limit. Delete some items to free up storage space and try again',
								code_NODE_WRITE_ERROR: 'Error! Copy permissions failed',
								operation_copyNodes: 'Copy action failed.',
								operation_cloneVersion: 'Clone action failed.'
							}
						}
					}
				}
			});
		return newI18n;
	}
}
