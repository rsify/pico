import {Either, map as mapEither} from 'fp-ts/es6/Either'
import {pipe} from 'fp-ts/es6/pipeable'

import {
	createElement,
	createSVGElement,
	xhtmlNS
} from './element'
import {DetailedError} from './error'
import {WindowInfo, getWindowInfo} from './window-info'

export type Container = {
	parentWindow: WindowInfo
	tree: {
		html: HTMLHtmlElement
		head: HTMLHeadElement
		svg: SVGSVGElement
	}
}

const getBackgroundColor = (
	$window: Window,
	$element: HTMLElement
): string => {
	const {backgroundColor} = $window.getComputedStyle($element)
	return backgroundColor === 'transparent' ||
		backgroundColor === 'rgba(0, 0, 0, 0)'
		? 'white'
		: backgroundColor
}

export const createTree = (windowInfo: WindowInfo) => {
	const {
		innerWidth: width,
		innerHeight: height
	} = windowInfo.window

	const h = createElement(windowInfo.document)
	const s = createSVGElement(windowInfo.document)

	const $iframe = h('iframe', {
		width: width + 'px',
		height: height + 'px'
	})

	const $svg = s('svg', {
		width: width + 'px',
		height: height + 'px'
	})

	$svg.style.backgroundColor = getBackgroundColor(
		windowInfo.window,
		windowInfo.body
	)

	const $foreignObject = s('foreignObject', {
		x: '0',
		y: '0',
		width: width + 'px',
		height: height + 'px'
	})

	const $newHtml = h('html')
	$newHtml.setAttribute('xmlns', xhtmlNS)

	const $newHead = h('head')
	$newHtml.appendChild($newHead)

	$newHtml.appendChild($newHead)

	$foreignObject.appendChild($newHtml)
	$svg.appendChild($foreignObject)
	$iframe.appendChild($svg)

	return {
		html: $newHtml,
		head: $newHead,
		svg: $svg
	}
}

export const createContainer = (
	$window: Window
): Either<DetailedError, Container> =>
	pipe(
		getWindowInfo($window),
		mapEither(parentWindow => ({
			parentWindow,
			tree: createTree(parentWindow)
		}))
	)
