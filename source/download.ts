import {Future, FutureInstance, attemptP} from 'fluture'

import {DetailedError, err} from './error'
import {noop} from './noop'

export type NetworkError = {
	_tag: 'NetworkError'
	url: string
}

export type HTTPError = {
	_tag: 'HTTPError'
	url: string
	status: number
	statusText: string
}

export type DownloadError = NetworkError | HTTPError

export const download = (
	url: string
): FutureInstance<DownloadError, Response> =>
	Future((reject, resolve) => {
		fetch(url, {cache: 'force-cache'})
			.then(response => {
				if (response.ok) {
					resolve(response)
				} else {
					reject({
						_tag: 'HTTPError',
						url,
						status: response.status,
						statusText: response.statusText
					})
				}
			})
			.catch(error => {
				reject({
					_tag: 'NetworkError',
					url
				})
			})

		return noop
	})

export const responseToText = (
	response: Response
): FutureInstance<DetailedError, string> =>
	Future((reject, resolve) => {
		response
			.text()
			.then(resolve)
			.catch(error =>
				reject({
					error,
					reason: `Failed to convert response to text (${response.url})`
				})
			)

		return noop
	})

export const responseToBlob = (
	response: Response
): FutureInstance<DetailedError, Blob> =>
	Future((reject, resolve) => {
		response
			.blob()
			.then(resolve)
			.catch(error =>
				reject({
					error,
					reason: `Failed to convert response to text (${response.url})`
				})
			)

		return noop
	})

export const blobToDataURL = (
	blob: Blob
): FutureInstance<DetailedError, string> =>
	Future((reject, resolve) => {
		const reader = new FileReader()
		reader.onloadend = () =>
			typeof reader.result === 'string'
				? resolve(reader.result)
				: reject(
						err(
							`Got invalid type when reading blob (${typeof reader.result})`
						)
				  )
		reader.onerror = () =>
			reject(err('Failed to load data url for blob'))
		reader.readAsDataURL(blob)

		return reader.abort
	})

export const downloadErrorToDetailedError = (
	downloadError: DownloadError
): DetailedError => {
	const reason =
		`Failed to download resource at ${downloadError.url} ` +
		(downloadError._tag === 'NetworkError'
			? '(Network Error, most likely a CORS issue)'
			: `(Status: ${downloadError.status} - ${downloadError.statusText})`)

	return {
		reason,
		error: new Error(reason)
	}
}
