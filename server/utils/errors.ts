import { createError } from 'h3'

export interface ApiErrorInput {
	statusCode: number
	code: string
	data?: Record<string, unknown>
}

export const createApiError = (input: ApiErrorInput) =>
	createError({
		statusCode: input.statusCode,
		statusMessage: input.code,
		message: input.code,
		data: {
			code: input.code,
			...(input.data ?? {}),
		},
	})

export const createBadRequestError = (
	code: string,
	data?: Record<string, unknown>,
) =>
	createApiError({
		statusCode: 400,
		code,
		data,
	})
