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
	const fontStylePort = await getPort()
	const fontFilePort = await getPort()

	const fontStyleContent = () =>
		fs
			.readFile(path.join(__dirname, 'font.css'), 'utf8')
			.then(contents =>
				contents.replace(
					'{{FONT_FILE_SRC}}',
					`http://test3.localhost:${fontFilePort}`
				)
			)

	const fontFileContent = () =>
		fs.readFile(path.join(__dirname, 'font.woff2'))

	const htmlContents = (
		await fs.readFile(
			path.join(__dirname, 'index.html'),
			'utf8'
		)
	).replace(
		'{{FONT_STYLE_SRC}}',
		`http://test2.localhost:${fontStylePort}`
	)

	return withServer<TestScreenshots>(
		'font/woff2',
		fontFileContent,
		fontFilePort,
		app => app.use(cors())
	)(() =>
		withServer<TestScreenshots>(
			'css',
			fontStyleContent,
			fontStylePort,
			app => app.use(cors())
		)(() =>
			withBasicServer<TestScreenshots>(
				htmlContents
			)(address => runBasicTest(browser, address))
		)
	)
}
