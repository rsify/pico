export const svgNS = 'http://www.w3.org/2000/svg'
export const xhtmlNS = 'http://www.w3.org/1999/xhtml'

export const createSVGElement = ($document: Document) => <
	TagName extends keyof SVGElementTagNameMap
>(
	tagName: TagName,
	options: {[k: string]: string} = {}
) => {
	const $el = $document.createElementNS(svgNS, tagName)
	Object.entries(options).forEach(([key, value]) =>
		$el.setAttribute(key, value)
	)
	return $el
}

export const createElement = ($document: Document) => <
	TagName extends keyof HTMLElementTagNameMap
>(
	tagName: TagName,
	properties: Partial<HTMLElementTagNameMap[TagName]> = {}
) => {
	const $el = $document.createElement(tagName)
	Object.assign($el, properties)
	return $el
}
