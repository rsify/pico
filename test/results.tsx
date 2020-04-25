import React from 'react'
import ReactDOMServer from 'react-dom/server'

import {TestResult} from './types'

const border: React.CSSProperties = {
	border: '1px solid gray'
}

const TestResults = (testResults: TestResult) => (
	<div>
		<h1>Name: {testResults.name}</h1>
		<div>
			{testResults.success ? (
				<div>
					<div style={{display: 'flex'}}>
						<div>
							<h2>
								Expected (Playwright screenshot)
							</h2>
							<img
								style={border}
								src={
									testResults.screenshots
										.expected
								}
							/>
						</div>
						<div>
							<h2>Actual (Pico output)</h2>
							<img
								style={border}
								src={
									testResults.screenshots
										.actual
								}
							/>
						</div>
					</div>
					{testResults.screenshots.errors.length ===
					0 ? (
						''
					) : (
						<div>
							<h3>Warnings:</h3>
							{testResults.screenshots.errors.map(
								error => (
									<div
										style={{
											backgroundColor:
												'yellow'
										}}
									>
										{error}
									</div>
								)
							)}
						</div>
					)}
				</div>
			) : (
				<div style={{color: 'red'}}>
					<h2>
						Failed to run test '{testResults.name}'
					</h2>
					<p style={{whiteSpace: 'pre'}}>
						{typeof testResults.error.stack ===
						'string'
							? testResults.error.stack
							: 'Unknown error'}
					</p>
				</div>
			)}
		</div>
		<hr />
	</div>
)

const backgroundImageURL =
	'data:image/svg+xml;charset=utf-8;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB5PSIxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSIxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9IiNFM0UzRTMiLz4KPHJlY3QgeD0iMTYiIHk9IjE2IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9IiNFM0UzRTMiLz4KPC9zdmc+Cg=='

const ResultsPage = (testsResults: TestResult[]) => (
	<html>
		<head>
			<meta charSet="utf-8" />
		</head>
		<body
			style={{
				backgroundImage: `url("${backgroundImageURL}")`
			}}
		>
			{testsResults.map(testResult => (
				<div key={testResult.name}>
					{TestResults(testResult)}
				</div>
			))}
		</body>
	</html>
)

export const render = (testsResults: TestResult[]) =>
	ReactDOMServer.renderToString(ResultsPage(testsResults))
