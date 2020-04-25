import {Either, left, right} from 'fp-ts/es6/Either'

import {DetailedError, err} from './error'

export type WindowInfo = {
	window: Window
	document: Document
	html: HTMLHtmlElement
	head: HTMLHeadElement
	body: HTMLBodyElement
}

export const getWindowInfo = (
	$window: Window
): Either<DetailedError, WindowInfo> => {
	const $document = $window.document
	const $head = $document.head
	const $body = $document.body
	const $html = $document.querySelector('html')

	if (!($html instanceof HTMLHtmlElement)) {
		return left(err('Failed to get HTMLHtmlElement'))
	}

	if (!($body instanceof HTMLBodyElement)) {
		return left(err('Failed to get HTMLBodyElement'))
	}

	// const $canvas = $document.createElement('canvas')
	// const ctx = $canvas.getContext('2d')
	// const $iframe = $document.createElement('iframe')
	// const $svg = $document.createElementNS(svgNS, 'svg')
	return right({
		window: $window,
		document: $document,
		html: $html,
		head: $head,
		body: $body
	})
}
