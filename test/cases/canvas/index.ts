import {promises as fs} from 'fs'
import path from 'path'

import {PlaywrightBrowser, TestScreenshots} from '../../types'
import runBasicTest from '../basic-runner'
import withBasicServer from '../basic-server'

export default async (browser: PlaywrightBrowser) => {
	const htmlContents = await fs.readFile(
		path.join(__dirname, 'index.html'),
		'utf8'
	)

	return withBasicServer<TestScreenshots>(
		htmlContents
	)(address => runBasicTest(browser, address))
}
