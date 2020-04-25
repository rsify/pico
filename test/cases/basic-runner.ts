import playwright from 'playwright'

import {PlaywrightBrowser, TestScreenshots} from '../types'
import {log, pngBufferToDataURL} from '../util'

export default async (
	browser: PlaywrightBrowser,
	address: string,
	size: {width: number; height: number} = {
		width: 800,
		height: 600
	},
	picoOptions?: any
): Promise<TestScreenshots> => {
	log('Creating browser context')
	const context = await browser.newContext({
		viewport: {
			...size
		}
	})

	log('Creating context page')
	const page = await context.newPage()

	page.on('console', (msg: playwright.ConsoleMessage) =>
		console.log(
			'[page console]',
			msg.text() ||
				msg
					.args()
					.map(jsHandle => jsHandle.toString())
					.join(' ')
		)
	)

	page.on('pageerror', (error: Error) => {
		console.error('[!] [page error]', error)
	})

	page.on('requestfailed', (request: playwright.Request) => {
		console.error(
			'[!] [request failed]',
			'url:',
			request.url(),
			'reason:',
			request.failure()?.errorText
		)
	})

	log('Browsing to target page')
	await page.goto(address)

	log('Taking expected screenshot')
	const expected: string = pngBufferToDataURL(
		await page.screenshot()
	)

	log('Taking actual screenshot')
	const {
		actual,
		errors
	}: {
		actual: string
		errors: string[]
	} = await page.evaluate(
		opts =>
			//@ts-ignore
			Pico.dataURL(window, opts).then(
				//@ts-ignore
				({value, errors}) => ({
					actual: value,
					//@ts-ignore
					errors: errors.map(e => e.reason)
				})
			),
		picoOptions
	)

	log('Closing page')
	await page.close()

	log('Test run done')

	return {
		actual,
		errors,
		expected
	}
}
