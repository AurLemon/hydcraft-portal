import { createError } from 'h3'

export interface ApiErrorInput {
	statusCode: number
	code: string
	data?: Record<string, unknown>
}

const API_ERROR_CODE_PATTERN = /^[A-Z0-9_]+$/

export const createApiError = (input: ApiErrorInput) => {
	if (!API_ERROR_CODE_PATTERN.test(input.code)) {
		throw new Error(`Invalid API error code: ${input.code}`)
	}

	return createError({
		statusCode: input.statusCode,
		statusMessage: input.code,
		message: input.code,
		data: {
			code: input.code,
			...(input.data ?? {}),
		},
	})
}

export const createBadRequestError = (
	code: string,
	data?: Record<string, unknown>,
) =>
	createApiError({
		statusCode: 400,
		code,
		data,
	})
