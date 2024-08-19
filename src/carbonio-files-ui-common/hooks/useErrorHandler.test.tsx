/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import '@testing-library/jest-dom';

import { ApolloError } from '@apollo/client';
import { act } from '@testing-library/react';
import { GraphQLError } from 'graphql';

import { useErrorHandler } from './useErrorHandler';
import { ERROR_CODE } from '../constants';
import { generateError, screen, setup, within } from '../tests/utils';

type Props = {
	errors: Array<GraphQLError>;
};

const TestComponent = ({ errors }: Props): React.JSX.Element => {
	useErrorHandler(
		new ApolloError({
			graphQLErrors: errors
		}),
		'COPY_NODES'
	);
	return <></>;
};

describe('useErrorHandler', () => {
	it('should show a permanent snackbar if the error is the over quota error', async () => {
		const err: GraphQLError = generateError('Copy error', { code: ERROR_CODE.overQuotaReached });
		setup(<TestComponent errors={[err]} />);
		const snackbar = await screen.findByTestId('snackbar');
		expect(
			within(snackbar).getByText(
				'You have reached your storage limit. Delete some items to free up storage space and try again'
			)
		).toBeVisible();
		expect(within(snackbar).getByText(/Ok/i)).toBeVisible();
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(
			within(snackbar).getByText(
				'You have reached your storage limit. Delete some items to free up storage space and try again'
			)
		).toBeVisible();
	});

	it('should show a temporary snackbar if the error is not the over quota error', async () => {
		const err: GraphQLError = generateError('Error! Copy permissions failed', {
			code: ERROR_CODE.nodeWriteError
		});
		setup(<TestComponent errors={[err]} />);
		const snackbar = await screen.findByTestId('snackbar');
		expect(within(snackbar).getByText(/Error! Copy permissions failed/i)).toBeVisible();
		// close snackbar
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
		expect(screen.queryByText(/Error! Copy permissions failed/i)).not.toBeInTheDocument();
	});

	it('should show the snackbar for the first error if there are multiple error codes', async () => {
		const errors: Array<GraphQLError> = [
			generateError('Error! Copy permissions failed', { code: ERROR_CODE.nodeWriteError }),
			generateError('Copy error', { code: ERROR_CODE.overQuotaReached })
		];
		setup(<TestComponent errors={errors} />);
		const snackbar = await screen.findByTestId('snackbar');
		expect(within(snackbar).getByText(/Error! Copy permissions failed/i)).toBeVisible();
		// second error is not shown
		expect(
			screen.queryByText(
				'You have reached your storage limit. Delete some items to free up storage space and try again'
			)
		).not.toBeInTheDocument();
		// close snackbar
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
		expect(screen.queryByText(/Error! Copy permissions failed/i)).not.toBeInTheDocument();
	});
});
