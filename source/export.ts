import {Future, chain as chainFluture, reject} from 'fluture'
import {fromEither as flutureFromEither} from 'fp-ts-fluture/es6/Future'
import {Either, left, right} from 'fp-ts/es6/Either'
import {flow} from 'fp-ts/es6/function'
import {pipe} from 'fp-ts/es6/pipeable'

import {Container} from './container'
import {createElement} from './element'
import {DetailedError, err} from './error'
import {Fluture, timeout} from './future'
import {noop} from './noop'

const serializeSVGToDataURL = ($svg: SVGSVGElement): string =>
	'data:image/svg+xml;charset=utf-8,' +
	window.encodeURIComponent(
		new XMLSerializer().serializeToString($svg)
	)

const canvasToPngBlob = (
	$canvas: HTMLCanvasElement
): Fluture<DetailedError, Blob> =>
	Future((rej, res) => {
		try {
			$canvas.toBlob(
				maybeBlob => {
					if (maybeBlob === null) {
						return rej(
							err(
								'Failed to get blob from canvas ' +
									'(the returned blob is null)'
							)
						)
					}
					res(maybeBlob)
				},
				'image/png',
				1
			)
		} catch {
			rej(
				err(
					'Failed to get blob from canvas ' +
						'(the canvas is most likely tainted)'
				)
			)
		}

		return noop
	})

const canvasToPngDataURL = (
	$canvas: HTMLCanvasElement
): Either<DetailedError, string> => {
	try {
		return right($canvas.toDataURL('image/png', 1))
	} catch {
		return left(
			err(
				'Failed to get data url from canvas ' +
					'(the canvas is most likely tainted)'
			)
		)
	}
}

export const containerToCanvas = (
	container: Container
): Fluture<DetailedError, HTMLCanvasElement> => {
	const scalingRatio =
		container.parentWindow.window.devicePixelRatio || 1

	const $canvas = createElement(
		container.parentWindow.document
	)('canvas', {
		width:
			container.parentWindow.window.innerWidth *
			scalingRatio,
		height:
			container.parentWindow.window.innerHeight *
			scalingRatio
	})

	const ctx = $canvas.getContext('2d')

	if (ctx === null) {
		return reject(err('Failed to obtain 2d canvas context'))
	}

	return timeout(2000)(
		Future((rej, res) => {
			const $img = new Image()

			$img.onerror = () =>
				rej(
					err(
						`Failed to load exported <img> onto canvas`
					)
				)

			$img.onload = () => {
				ctx.setTransform(
					scalingRatio,
					0,
					0,
					scalingRatio,
					0,
					0
				)

				ctx.drawImage($img, 0, 0)

				res($canvas)
			}

			$img.src = serializeSVGToDataURL(container.tree.svg)

			return $img.remove
		})
	)
}

const dataURLToBlob = (
	dataURL: string
): Fluture<DetailedError, Blob> =>
	Future((rej, res) => {
		fetch(dataURL)
			.then(x => x.blob())
			.then(res)
			.catch(() =>
				rej(
					err(
						`Failed to convert dataURL to blob (${dataURL})`
					)
				)
			)

		return noop
	})

export const containerToSVGBlob = (
	container: Container
): Fluture<DetailedError, Blob> =>
	pipe(
		serializeSVGToDataURL(container.tree.svg),
		dataURLToBlob
	)

export const containerToPngBlob = (
	container: Container
): Fluture<DetailedError, Blob> =>
	pipe(
		containerToCanvas(container),
		chainFluture(canvasToPngBlob)
	)

export const containerToPngDataURL = (
	container: Container
): Fluture<DetailedError, string> =>
	pipe(
		containerToCanvas(container),
		chainFluture(flow(canvasToPngDataURL, flutureFromEither))
	)

// Type safe wrapper for URL.createObjectURL. Also because this
// function creates a reference in a global object URL store,
// this function is technically impure.
export const createObjectURL = (
	object: File | Blob | MediaSource
): Either<DetailedError, string> => {
	try {
		return right(URL.createObjectURL(object))
	} catch {
		return left(err('Failed to create result object URL'))
	}
}
