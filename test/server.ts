import cheerio from 'cheerio'
import express, {Express} from 'express'
import nocache from 'nocache'
import open from 'open'
import WebSocket from 'ws'

import {MaybePromise, disposable, log} from './util'

export const withServer = <T>(
	mime: string,
	getData: () => PromiseLike<string | Buffer>,
	port: number,
	prependMiddlewareFn?: (app: Express) => Express
) => {
	const serverName = `${mime}:${port}`
	log(`Starting server ${serverName}`)

	return disposable<T, Express>(
		() =>
			new Promise<[Express, () => void]>(resolve => {
				const app = express()

				if (prependMiddlewareFn) {
					prependMiddlewareFn(app)
				}

				app.use(nocache())
					.disable('etag')
					.get('/', (_, res) =>
						getData().then(data =>
							res.contentType(mime).send(data)
						)
					)

				const server = app.listen(port, () =>
					resolve([
						app,
						() => {
							log(`Closing server ${serverName}`)
							server.close()
						}
					])
				)
			})
	)
}

const liveReloadScript = (port: number) =>
	`
		const ws = new WebSocket('ws://test.localhost:${port}')
		ws.onmessage = () => window.location.reload()
	`.trim()

const injectLiveReloadScript = (
	html: string,
	port: number
): string => {
	const $ = cheerio.load(html)
	$('head').append(
		`<script>${liveReloadScript(port)}</script>`
	)
	return $.html()
}

export type ReloadFn = (newContent: string) => void
export type OpenInBrowserFn = () => Promise<void>

export const withLiveReloadServer = <T>(
	mime: string,
	port: number
): ((
	fn: (
		value: [ReloadFn, OpenInBrowserFn, Express]
	) => MaybePromise<T>
) => Promise<T>) => {
	const serverName = `${mime}:${port}`
	log(`Starting live reload server ${serverName}`)

	let currentContent = '<html><head></head></html>'

	const openInBrowser = () =>
		open(`http://test.localhost:${port}`, {
			background: true
		}).then(() => {})

	return disposable<T, [ReloadFn, OpenInBrowserFn, Express]>(
		() =>
			new Promise<
				[
					[ReloadFn, OpenInBrowserFn, Express],
					() => void
				]
			>(resolve => {
				const updateListeners: Set<WebSocket> = new Set()
				const update = (newContent: string) => {
					currentContent = newContent

					for (const listener of updateListeners) {
						listener.send('update')
					}
				}

				const app = express()
					.use(nocache())
					.disable('etag')
					.get('/', (_, res) => {
						// Inject ws live reload script
						res.contentType(mime).send(
							injectLiveReloadScript(
								currentContent,
								port
							)
						)
					})

				const server = app.listen(port, () =>
					resolve([
						[update, openInBrowser, app],
						() => {
							log(
								`Closing live reload server ${serverName}`
							)
							server.close()
							wss.close()
						}
					])
				)

				const wss = new WebSocket.Server({server})
				wss.on('connection', ws => {
					updateListeners.add(ws)

					ws.on('close', () =>
						updateListeners.delete(ws)
					)
				})
			})
	)
}
