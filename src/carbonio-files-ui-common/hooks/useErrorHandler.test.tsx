/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import '@testing-library/jest-dom';

import { ApolloError } from '@apollo/client';
import { GraphQLError } from 'graphql';
import { act } from 'react-dom/test-utils';

import { useErrorHandler } from './useErrorHandler';
import { ERROR_CODE } from '../constants';
import { generateError, screen, setup, within } from '../utils/testUtils';

type Props = {
	err: GraphQLError;
};

const TestComponent = ({ err }: Props): React.JSX.Element => {
	useErrorHandler(
		new ApolloError({
			graphQLErrors: [err]
		}),
		'COPY_NODES'
	);
	return <></>;
};

describe('useErrorHandler', () => {
	it('should show a permanent snackbar if the error is the over quota error', async () => {
		const err: GraphQLError = generateError(
			'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again',
			ERROR_CODE.overQuotaReached
		);
		setup(<TestComponent err={err} />);
		const snackbar = await screen.findByTestId('snackbar');
		expect(
			within(snackbar).getByText(
				'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again'
			)
		).toBeVisible();
		expect(within(snackbar).getByText(/Ok/i)).toBeVisible();
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(
			within(snackbar).getByText(
				'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again'
			)
		).toBeVisible();
	});

	it('should show a temporary snackbar if the error is not the over quota error', async () => {
		const err: GraphQLError = generateError(
			'Error! Copy permissions failed',
			ERROR_CODE.nodeWriteError
		);
		setup(<TestComponent err={err} />);
		const snackbar = await screen.findByTestId('snackbar');
		expect(within(snackbar).getByText(/Error! Copy permissions failed/i)).toBeVisible();
		// close snackbar
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
		expect(screen.queryByText(/Error! Copy permissions failed/i)).not.toBeInTheDocument();
	});
});
