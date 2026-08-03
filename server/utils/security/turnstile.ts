import type { H3Event } from 'h3'
import type { TurnstileAction } from '~/utils/security/turnstile-actions'
import { createApiError } from '../errors'

interface ValidateTurnstileTokenInput {
	event: H3Event
	token: string | null | undefined
	action: TurnstileAction
}

export const validateTurnstileToken = async (
	input: ValidateTurnstileTokenInput,
): Promise<void> => {
	const token = input.token?.trim()

	if (!token) {
		throw createApiError({
			statusCode: 400,
			code: 'CAPTCHA_REQUIRED',
		})
	}

	const secretKey = useRuntimeConfig(input.event).turnstile.secretKey?.trim()
	if (!secretKey) {
		throw createApiError({
			statusCode: 500,
			code: 'CAPTCHA_CONFIG_MISSING',
		})
	}

	let result: Awaited<ReturnType<typeof verifyTurnstileToken>>
	try {
		result = await verifyTurnstileToken(token, input.event)
	} catch {
		throw createApiError({
			statusCode: 502,
			code: 'CAPTCHA_VERIFY_FAILED',
		})
	}

	if (!result.success || result.action !== input.action) {
		const statusCode = result['error-codes'].includes('internal-error')
			? 502
			: 400
		throw createApiError({
			statusCode,
			code: statusCode === 502 ? 'CAPTCHA_VERIFY_FAILED' : 'CAPTCHA_INVALID',
		})
	}
}
