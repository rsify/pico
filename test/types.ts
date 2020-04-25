import playwright from 'playwright'

export type PlaywrightBrowser =
	| playwright.ChromiumBrowser
	| playwright.FirefoxBrowser
	| playwright.WebKitBrowser

export type TestResult =
	| {
			success: true
			name: string
			screenshots: TestScreenshots
	  }
	| {
			success: false
			name: string
			error: any
	  }

export type TestScreenshots = {
	actual: string
	errors: string[]
	expected: string
}
