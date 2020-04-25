import {PlaywrightBrowser, TestScreenshots} from '../types'
import atImport from './at-import'
import canvas from './canvas'
import foreignFont from './foreign-font'
import hello from './hello'
import ignore from './ignore'
import images from './images'
import input from './input'
import remCSS from './rem-css'
import remStyle from './rem-style'
import responsive from './responsive'
import scrollElementBasic from './scroll-element-basic'
import scrollElementChildren from './scroll-element-children'
import scrollPage from './scroll-page'
import svg from './svg'
import warnings from './warnings'

export default new Map<
	string,
	(browser: PlaywrightBrowser) => Promise<TestScreenshots>
>([
	['at-import', atImport],
	['canvas', canvas],
	['foreign-font', foreignFont],
	['hello', hello],
	['ignore', ignore],
	['images', images],
	['input', input],
	['rem-css', remCSS],
	['rem-style', remStyle],
	['responsive', responsive],
	['scroll-element-basic', scrollElementBasic],
	['scroll-element-children', scrollElementChildren],
	['scroll-page', scrollPage],
	['svg', svg],
	['warnings', warnings]
])
