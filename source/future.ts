import {Future, FutureInstance, race} from 'fluture'

import {DetailedError, err} from './error'

export type Fluture<L, R> = FutureInstance<L, R>

export const timeout = (ms: number) => <R>(
	fl: Fluture<DetailedError, R>
): Fluture<DetailedError, R> =>
	race(
		Future<DetailedError, R>(rej => {
			const timeout = setTimeout(
				() =>
					rej(
						err(
							`Timed out waiting for promise (${ms}ms)`
						)
					),
				ms
			)
			return () => clearTimeout(timeout)
		})
	)(fl)
