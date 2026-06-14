import { createApiError } from '../errors'

interface CapValidateResponse {
	success?: boolean
}

interface ValidateCapTokenInput {
	token: string | null | undefined
}

const normalizeCapBaseUrl = (): string => {
	const runtimeConfig = useRuntimeConfig()
	const value = runtimeConfig.cap.baseUrl?.trim()

	if (!value) {
		throw createApiError({
			statusCode: 500,
			code: 'CAPTCHA_CONFIG_MISSING',
		})
	}

	return value.replace(/\/+$/, '')
}

export const validateCapToken = async (
	input: ValidateCapTokenInput,
): Promise<void> => {
	const token = input.token?.trim()

	if (!token) {
		throw createApiError({
			statusCode: 400,
			code: 'CAPTCHA_REQUIRED',
		})
	}

	const response = await fetch(`${normalizeCapBaseUrl()}/api/validate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			token,
			keepToken: false,
		}),
	})

	if (!response.ok) {
		throw createApiError({
			statusCode: 502,
			code: 'CAPTCHA_VERIFY_FAILED',
		})
	}

	const result = (await response.json()) as CapValidateResponse

	if (!result.success) {
		throw createApiError({
			statusCode: 400,
			code: 'CAPTCHA_INVALID',
		})
	}
}
