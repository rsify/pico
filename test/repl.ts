import path from 'path'
import readline from 'readline'

import chokidar from 'chokidar'
import getPort from 'get-port'

import {withBrowser} from './browser'
import cases from './cases'
import * as results from './results'
import {withLiveReloadServer} from './server'
import {TestResult} from './types'
import {awaitKey} from './util'

const question = (
	prompt: string,
	rl: readline.Interface
): Promise<string> =>
	new Promise<string>(resolve => {
		rl.question(prompt, resolve)
	}).then(x => {
		rl.pause()
		return x
	})

const main = async () => {
	console.log(
		'Bindings to test.localhost, test2.localhost, ..., test5.localhost to 127.0.0.1 in /etc/hosts are required to run these tests.'
	)

	const rl = readline
		.createInterface({
			input: process.stdin,
			output: process.stdout
		})
		.pause()
		.on('close', () => process.exit(0))

	const reporterPort = await getPort()
	withLiveReloadServer(
		'html',
		reporterPort
	)(([update, openInBrowser]) =>
		withBrowser('chromium')(browser => {
			openInBrowser()

			const line = async (): Promise<void> => {
				const input = await question(
					'Type command [open, run [(name of case)], watch [(name of case)], all] > ',
					rl
				)

				const [command] = input.split(' ')

				if (command === 'open') {
					await openInBrowser()
				} else if (command === 'run') {
					const [, testCaseName] = input.split(' ')

					const runTestCase = cases.get(testCaseName)

					if (runTestCase === undefined) {
						console.error(
							`No case found with the name of '${testCaseName}'`,
							`(available: ${[
								...cases.keys()
							].join(', ')})`
						)

						return line()
					}

					const screenshots = await runTestCase(
						browser
					)

					const rendered = results.render([
						{
							success: true,
							name: testCaseName,
							screenshots
						}
					])

					update(rendered)
				} else if (command === 'watch') {
					const [, testCaseName] = input.split(' ')

					const runTestCase = cases.get(testCaseName)

					if (runTestCase === undefined) {
						console.error(
							`No case found with the name of '${testCaseName}'`,
							`(available: ${[
								...cases.keys()
							].join(', ')})`
						)

						return line()
					}

					const watcher = chokidar.watch(
						[
							path.resolve(__dirname, '../source'),
							path.resolve(
								__dirname,
								`cases/${testCaseName}`
							)
						],
						{ignoreInitial: true}
					)

					console.log(
						'Watcher started, refreshing on every change of the ' +
							'dist folder. Press `q` to stop.'
					)

					const runTestAndUpdateResults = async () => {
						try {
							const screenshots = await runTestCase(
								browser
							)
							const rendered = results.render([
								{
									name: testCaseName,
									screenshots,
									success: true
								}
							])
							update(rendered)
						} catch (error) {
							const rendered = results.render([
								{
									success: false,
									name: testCaseName,
									error: error
								}
							])
							update(rendered)
						}
					}

					await runTestAndUpdateResults()

					watcher.on('all', runTestAndUpdateResults)

					await awaitKey('q')
					await watcher.close()
				} else if (command === 'all') {
					const testsResults = await Promise.all<
						TestResult
					>(
						[...cases.entries()].map(
							([name, runTestCase]) =>
								runTestCase(browser)
									.then<TestResult>(
										screenshots => ({
											success: true,
											name,
											screenshots
										})
									)
									.catch<TestResult>(
										error => ({
											success: false,
											name,
											error
										})
									)
						)
					)

					const rendered = results.render(testsResults)

					update(rendered)
				}

				return line()
			}

			return line()
		})
	)
}

main()
