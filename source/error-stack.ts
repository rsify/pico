import {flatten, lefts, map, reduce} from 'fp-ts/es6/Array'
import {Either} from 'fp-ts/es6/Either'
import {pipe} from 'fp-ts/es6/pipeable'

import {DetailedError} from './error'

const ErrorStack$: unique symbol = Symbol()
export type ErrorStack<T> = {
	_tag: typeof ErrorStack$
	errors: DetailedError[]
	value: T
}

export const empty = <T>(value: T): ErrorStack<T> => ({
	_tag: ErrorStack$,
	errors: [],
	value
})

export const fromEithers = <T>(value: T) => (
	eithers: Either<DetailedError, any>[]
): ErrorStack<T> => ({
	_tag: ErrorStack$,
	errors: lefts(eithers),
	value
})

export const fromError = <T>(value: T) => (
	error: DetailedError
): ErrorStack<T> => fromErrors(value)([error])

export const fromErrors = <T>(value: T) => (
	errors: DetailedError[]
): ErrorStack<T> => ({
	_tag: ErrorStack$,
	errors,
	value
})

export const concat = <T>(
	stack: ErrorStack<T>,
	error: DetailedError
): ErrorStack<T> => ({
	_tag: ErrorStack$,
	errors: stack.errors.concat(error),
	value: stack.value
})

export const fold = <T>(
	foldValueFn: (a: T, b: T) => T,
	initValue: T
) => (stacks: ErrorStack<T>[]): ErrorStack<T> => ({
	_tag: ErrorStack$,
	errors: pipe(
		stacks,
		map(s => s.errors),
		flatten
	),
	value: pipe(
		stacks,
		map(s => s.value),
		reduce(initValue, foldValueFn)
	)
})

export const value = <T>(stack: ErrorStack<T>): T => stack.value
export const errors = <T>(
	stack: ErrorStack<T>
): DetailedError[] => stack.errors
