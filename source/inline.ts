import {
	chain as chainFluture,
	coalesce,
	both as flutureBoth,
	map as mapFluture,
	mapRej,
	parallel,
	reject,
	resolve
} from 'fluture'
import {filter, flatten, map} from 'fp-ts/es6/Array'
import {Either, left, right} from 'fp-ts/es6/Either'
import {identity} from 'fp-ts/es6/function'
import {pipe} from 'fp-ts/es6/pipeable'

import {Container} from './container'
import {
	blobToDataURL,
	download,
	downloadErrorToDetailedError,
	responseToBlob,
	responseToText
} from './download'
import {DetailedError} from './error'
import {
	ErrorStack,
	empty as emptyErrorStack,
	errors as errorStackErrors,
	fromEithers as errorStackFromEithers,
	fromError as errorStackFromError,
	fromErrors as errorStackFromErrors,
	value as errorStackValue,
	fold as foldErrorStacks
} from './error-stack'
import {Fluture} from './future'

const parallelAll = parallel(Infinity)

function isCSSStyleSheet(
	sheet: unknown
): sheet is CSSStyleSheet {
	return sheet instanceof CSSStyleSheet
}

// Takes a non-global, non-sticky RegExp object with exactly one capturing
// group
const replaceAllAsync = (
	regex: RegExp,
	replaceFn: (part: string) => Fluture<DetailedError, string>
) => (input: string): Fluture<never, ErrorStack<string>> => {
	if (regex.global || regex.sticky) {
		throw new TypeError(
			'Only non-global and non-sticky ' +
				"(without the /g or /y flags) regex' can be used"
		)
	}

	const result = regex.exec(input)

	if (result === null) {
		return resolve(emptyErrorStack(input))
	}

	const theWholeMatch = result[0]
	const firstGroup = result[1]

	if (typeof result[1] !== 'string') {
		return resolve(emptyErrorStack(input))
	}

	const start = input.substring(0, result.index)
	const middleF = pipe(
		replaceFn(firstGroup),
		coalesce<DetailedError, ErrorStack<string>>(
			errorStackFromError(firstGroup)
		)(emptyErrorStack)
	)
	const endF = replaceAllAsync(
		regex,
		replaceFn
	)(input.substring(result.index + theWholeMatch.length))

	return pipe(
		flutureBoth(middleF)(endF),
		mapFluture(([middle, end]) =>
			errorStackFromErrors(
				start + middle.value + end.value
			)(flatten([middle.errors, end.errors]))
		)
	)
}

const processStyleSheetText = (baseURL: string) => (
	styleSheetText: string
): Fluture<DetailedError, ErrorStack<string>> => {
	const $stylesheetStyle = document.createElement('style')

	$stylesheetStyle.appendChild(
		document.createTextNode(styleSheetText)
	)

	const $fakeDocument = document.implementation.createHTMLDocument()
	$fakeDocument.head.appendChild($stylesheetStyle)

	const {sheet} = $stylesheetStyle

	if (!(sheet instanceof CSSStyleSheet)) {
		const reason = 'Failed to initialize CSSStyleSheet'

		return reject({
			reason,
			error: new Error(reason)
		})
	}

	return inlineURLsFromCSSRuleList(sheet.cssRules, baseURL)
}

const URL_REGEX = /url\(['"]?(.+?)['"]?\)/
const inlineStyleSheetTextURLs = (baseURL: string) =>
	replaceAllAsync(URL_REGEX, url => {
		if (url.indexOf('data:') === 0) {
			// Skip data urls
			return resolve(`url("${url}")`)
		}

		const absoluteURL = new URL(url, baseURL).toString()

		return pipe(
			download(absoluteURL),
			mapRej(downloadErrorToDetailedError),
			chainFluture(responseToBlob),
			chainFluture(blobToDataURL),
			mapFluture(dataURL => `url(${dataURL})`)
		)
	})

const inlineURLsFromCSSRule = (baseURL: string) => (
	rule: CSSRule
): Fluture<DetailedError, ErrorStack<string>> => {
	// https://developer.mozilla.org/en-US/docs/Web/CSS/url()
	// "The url() function can be included as a value for background,
	// background-image, list-style, list-style-image, content, cursor,
	// border, border-image, border-image-source, mask, mask-image, src as
	// part of a @font-face block, and @counter-style/symbol"
	if (rule instanceof CSSStyleRule) {
		// We go through only the allowed properties individually rather
		// than doing a single big rule.cssText.replace(blahblah) because
		// there can be special cases like `content`, where a property
		// that's just the url() call should be replaced but when it's a
		// url() call inside of a string it should not which makes using a
		// regex-only solution unreasonable.
		//
		// 1. Find all url() calls from `rule.style[x]`
		// 2. Fetch the resources under the url()'s
		// 3. Replace with base64 fetched contents using
		//    `rule.style.setProperty`
		//
		// Modifying rule.style[x] doesn't actually update the base css
		// text, which is a shame - instead we're going to update the
		// rule.style text and then return cssText, which DOES get updated.

		const rulesThatNeedTheirURLCallsInlined = [
			'background',
			'backgroundImage',
			'listStyle',
			'listStyleImage',
			'content',
			'cursor',
			'border',
			'borderImage',
			'borderImageSource',
			'mask',
			'maskImage'
		] as const

		return pipe(
			rulesThatNeedTheirURLCallsInlined.map(ruleName => {
				const ruleStyle = rule.style[ruleName] as
					| string
					| undefined

				if (
					ruleStyle === '' ||
					ruleStyle === undefined
				) {
					return resolve([])
				}

				return pipe(
					inlineStyleSheetTextURLs(baseURL)(ruleStyle),
					mapFluture(({errors, value}) => {
						// fp gods please spare me again
						rule.style[ruleName] = value

						return errors
					})
				)
			}),
			parallelAll,
			mapFluture(flatten),
			mapFluture(e =>
				// Needs to be a thunk to let the rule.cssText update
				errorStackFromErrors(rule.cssText)(e)
			)
		)
	} else if (rule instanceof CSSFontFaceRule) {
		// Setting `src` in a @font-face declaration is not supported in
		// Firefox, we unfortunately have to replace things manually
		return inlineStyleSheetTextURLs(baseURL)(rule.cssText)
	} else if (rule instanceof CSSMediaRule) {
		if (window.matchMedia(rule.media.mediaText).matches) {
			return inlineURLsFromCSSRuleList(
				rule.cssRules,
				baseURL
			)
		} else {
			return resolve(emptyErrorStack(''))
		}
	} else if (rule instanceof CSSImportRule) {
		// Download the referenced stylesheet recursively
		return pipe(
			download(rule.href),
			mapRej(downloadErrorToDetailedError),
			chainFluture(responseToText),
			chainFluture(processStyleSheetText(rule.href))
		)
	} else if (rule instanceof CSSPageRule) {
		// Library is not used in print contexts - safe to ignore.
		return resolve(emptyErrorStack(rule.cssText))
	}

	return resolve(emptyErrorStack(rule.cssText))
}

const inlineURLsFromCSSRuleList = (
	cssRules: CSSRuleList,
	baseURL: string
): Fluture<never, ErrorStack<string>> =>
	pipe(
		Array.from(cssRules),
		map(inlineURLsFromCSSRule(baseURL)),
		map(
			coalesce<DetailedError, ErrorStack<string>>(x =>
				errorStackFromErrors('')([x])
			)(identity)
		),
		parallelAll,
		mapFluture(foldErrorStacks((a, b) => `${a}\n${b}`, ''))
	)

// Cross-origin stylesheets cannot be read from directly, download any
// stylesheet that's not inline.
const extractStylesFromCSSStyleSheet = (baseURL: string) => (
	styleSheet: CSSStyleSheet
): Fluture<DetailedError, ErrorStack<string>> =>
	pipe(
		styleSheet.href
			? pipe(
					download(styleSheet.href),
					mapRej(downloadErrorToDetailedError),
					chainFluture(responseToText)
			  )
			: resolve(
					Array.from(styleSheet.cssRules)
						.map(rule => rule.cssText)
						.join('\n')
			  ),
		chainFluture(
			processStyleSheetText(styleSheet.href || baseURL)
		)
	)

const extractStylesFromStyleSheets = (
	styleSheets: StyleSheetList,
	baseURL: string
): Fluture<never, ErrorStack<string>[]> =>
	pipe(
		Array.from(styleSheets),
		filter(isCSSStyleSheet),
		map(extractStylesFromCSSStyleSheet(baseURL)),
		map(coalesce(errorStackFromError(''))(identity)),
		parallelAll
	)

const inlineExternalStylesheets = (
	container: Container
): Fluture<never, ErrorStack<Container>> =>
	pipe(
		extractStylesFromStyleSheets(
			container.parentWindow.document.styleSheets,
			container.parentWindow.window.location.href
		),
		mapFluture(stacks => {
			for (const styleContents of pipe(
				stacks,
				map(errorStackValue)
			)) {
				const $style = container.parentWindow.document.createElement(
					'style'
				)

				$style.appendChild(
					container.parentWindow.document.createTextNode(
						styleContents
					)
				)

				container.tree.head.appendChild($style)
			}

			const errors = pipe(
				stacks,
				map(errorStackErrors),
				flatten
			)

			return errorStackFromErrors(container)(errors)
		})
	)

// Inline all images on the page (improvement: can only
// inline *visible* images for potentially less network
// strain if cache doesn't work)
const inlineImages = (
	container: Container
): Fluture<never, ErrorStack<Container>> =>
	pipe(
		Array.from(container.tree.html.querySelectorAll('img')),
		map($image =>
			pipe(
				download($image.src),
				mapRej(downloadErrorToDetailedError),
				chainFluture(responseToBlob),
				chainFluture(blobToDataURL),
				mapFluture(dataURL => {
					// please don't hurt me fp gods
					$image.src = dataURL
					return dataURL
				}),
				coalesce<
					DetailedError,
					Either<DetailedError, string>
				>(left)(right)
			)
		),
		parallelAll,
		mapFluture(errorStackFromEithers(container))
	)

export const inlineExternalResources = (
	container: Container
): Fluture<never, ErrorStack<Container>> =>
	pipe(
		inlineImages(container),
		chainFluture(stack =>
			// Improvement: `errorStack.chain`
			pipe(
				inlineExternalStylesheets(
					errorStackValue(stack)
				),
				mapFluture(secondStack =>
					errorStackFromErrors(
						errorStackValue(secondStack)
					)(
						flatten([
							errorStackErrors(stack),
							errorStackErrors(secondStack)
						])
					)
				)
			)
		)
	)
