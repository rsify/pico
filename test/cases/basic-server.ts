import getPort from 'get-port'

import {withServer} from '../server'
import {MaybePromise} from '../util'

export default <T>(htmlContents: string) => async (
	fn: (address: string) => MaybePromise<T>
): Promise<T> => {
	const jsPort = 23231
	const htmlPort = await getPort()

	const getHtml = () =>
		Promise.resolve(
			htmlContents.replace(
				'{{SCRIPT_SRC}}',
				`http://test.localhost:${jsPort}/index.js`
			)
		)

	return withServer<T>(
		'html',
		getHtml,
		htmlPort
	)(() => fn(`http://test.localhost:${htmlPort}`))
}
