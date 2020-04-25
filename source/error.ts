export type DetailedError = {
	reason: string
	error: Error
}

export const err = (reason: string): DetailedError => ({
	reason,
	error: new Error(reason)
})
