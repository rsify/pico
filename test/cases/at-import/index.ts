// Caveat:
//
// Foreign origin resources NEED CORS headers in their responses -
// there's no other way around that.

import {promises as fs} from 'fs'
import path from 'path'

import cors from 'cors'
import getPort from 'get-port'

import {withServer} from '../../server'
import {PlaywrightBrowser, TestScreenshots} from '../../types'
import runBasicTest from '../basic-runner'
import withBasicServer from '../basic-server'

export default async (browser: PlaywrightBrowser) => {
	const level1Port = await getPort()
	const level2Port = await getPort()
	const level3Port = await getPort()

	const htmlContents = (
		await fs.readFile(
			path.join(__dirname, 'index.html'),
			'utf8'
		)
	).replace(
		'{{STYLE_LEVEL_1_SRC}}',
		`http://test2.localhost:${level1Port}`
	)

	const level1Contents = () =>
		fs
			.readFile(
				path.join(__dirname, 'level-1.css'),
				'utf8'
			)
			.then(contents =>
				contents.replace(
					'{{STYLE_LEVEL_2_SRC}}',
					`http://test3.localhost:${level2Port}`
				)
			)

	const level2Contents = () =>
		fs
			.readFile(
				path.join(__dirname, 'level-2.css'),
				'utf8'
			)
			.then(contents =>
				contents.replace(
					'{{STYLE_LEVEL_3_SRC}}',
					`http://test4.localhost:${level3Port}`
				)
			)

	const level3Contents = () =>
		fs.readFile(path.join(__dirname, 'level-3.css'), 'utf8')

	return withServer<TestScreenshots>(
		'css',
		level1Contents,
		level1Port,
		app => app.use(cors())
	)(() =>
		withServer<TestScreenshots>(
			'css',
			level2Contents,
			level2Port,
			app => app.use(cors())
		)(() =>
			withServer<TestScreenshots>(
				'css',
				level3Contents,
				level3Port,
				app => app.use(cors())
			)(() =>
				withBasicServer<TestScreenshots>(
					htmlContents
				)(address => runBasicTest(browser, address))
			)
		)
	)
}
