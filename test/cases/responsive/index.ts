import {promises as fs} from 'fs'
import path from 'path'

import {PlaywrightBrowser, TestScreenshots} from '../../types'
import runBasicTest from '../basic-runner'
import withBasicServer from '../basic-server'

export default (browser: PlaywrightBrowser) =>
	fs
		.readFile(path.join(__dirname, 'index.html'), 'utf8')
		.then(htmlContents =>
			withBasicServer<TestScreenshots>(htmlContents)(
				address =>
					runBasicTest(browser, address, {
						width: 500,
						height: 500
					})
			)
		)
