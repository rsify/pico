import readline from 'readline'

export type MaybePromise<T> = T | Promise<T>

export const disposable = <V, T>(
	f: () => PromiseLike<[T, () => void]>
) => (fn: (value: T) => MaybePromise<V>) =>
	Promise.resolve(f()).then(async ([value, dispose]) => {
		try {
			return await Promise.resolve(fn(value))
		} finally {
			dispose()
		}
	})

export const log = (...msgs: any[]) =>
	console.log(new Date(), ...msgs)

export const pngBufferToDataURL = (b: Buffer) =>
	'data:image/png;base64,' + b.toString('base64')

export interface KeypressDetails {
	sequence: string
	name: string
	ctrl: boolean
	meta: boolean
	shift: boolean
}

export const awaitKey = async (targetKeyName: string) => {
	readline.emitKeypressEvents(process.stdin)
	process.stdin.resume()
	process.stdin.setRawMode(true)

	await new Promise(resolve => {
		process.stdin.on(
			'keypress',
			(
				keyName: string | undefined,
				details: KeypressDetails
			) =>
				keyName === targetKeyName
					? resolve()
					: keyName === 'c' && details.ctrl
					? process.exit(0)
					: undefined
		)
	})

	process.stdin.setRawMode(false)
	process.stdin.pause()
}
