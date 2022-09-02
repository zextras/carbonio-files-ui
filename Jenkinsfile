/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

library(
	identifier: 'zapp-jenkins-lib@github-pipeline-v4',
	retriever: modernSCM([
		$class: 'GitSCMSource',
   		remote: 'git@bitbucket.org:zextras/zapp-jenkins-lib.git',
		credentialsId: 'tarsier_bot-ssh-key'
	])
)

zappPipeline(
	disableAutoTranslationsSync: true
)
