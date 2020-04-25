browser.pageAction.onClicked.addListener(async tab => {
	const code =
		await (await fetch('http://localhost:23231/index.js')).text()

	browser.tabs.sendMessage(tab.id, code)
})
