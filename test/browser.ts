import playwright from 'playwright'

import {PlaywrightBrowser} from './types'
import {disposable} from './util'

export const withBrowser = (
	name: 'chromium' | 'firefox' | 'webkit'
) =>
	disposable(
		async (): Promise<[PlaywrightBrowser, () => void]> => {
			const browser = await playwright[name].launch()

			return [browser, () => void browser.close()]
		}
	)
