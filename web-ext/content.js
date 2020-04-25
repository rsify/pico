browser.runtime.onMessage.addListener(code => {
	// const $script = document.createElement('script')
	// $script.appendChild(document.createTextNode(code))
	// document.body.appendChild($script)

	window.eval(code)
	// window.eval(`
	// 	Pico.png(window).then(result => {
	// 		console.log(browser)
	// 		console.warn('errors:', result.errors)
	// 	}).catch(console.error)
	// `)

	window.eval(`
		Pico.objectURL(window).then(objectURL => {
			console.warn('errors:', objectURL.errors)
			window.open(objectURL.value)
			URL.revokeObjectURL(objectURL.value)
		}).catch(console.error)
	`)
})
