import {promises as fs} from 'fs'
import path from 'path'

import cors from 'cors'
import getPort from 'get-port'

import {withServer} from '../../server'
import {PlaywrightBrowser, TestScreenshots} from '../../types'
import runBasicTest from '../basic-runner'
import withBasicServer from '../basic-server'

export default async (browser: PlaywrightBrowser) => {
	const imagePort = await getPort()

	const imageContent = () =>
		fs.readFile(path.join(__dirname, 'image.png'))

	const htmlContents = (
		await fs.readFile(
			path.join(__dirname, 'index.html'),
			'utf8'
		)
	).replace(
		/"{{IMG_SRC}}"/g,
		`http://test2.localhost:${imagePort}`
	)

	return withServer<TestScreenshots>(
		'png',
		imageContent,
		imagePort,
		app => app.use(cors())
	)(() =>
		withBasicServer<TestScreenshots>(htmlContents)(address =>
			runBasicTest(browser, address)
		)
	)
}
