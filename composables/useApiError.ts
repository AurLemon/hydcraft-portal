import type { Composer } from 'vue-i18n'

interface ApiErrorData {
	code?: unknown
	statusMessage?: unknown
	message?: unknown
}

interface ApiErrorLike {
	statusCode?: number
	status?: number
	statusMessage?: unknown
	message?: unknown
	data?: ApiErrorData
}

const ERROR_CODE_PATTERN = /^[A-Z0-9_]+$/

const isErrorCode = (value: unknown): value is string =>
	typeof value === 'string' && ERROR_CODE_PATTERN.test(value)

const normalizeErrorCode = (error: unknown): string | null => {
	if (typeof error !== 'object' || !error) {
		return null
	}

	const apiError = error as ApiErrorLike
	const candidates = [
		apiError.data?.code,
		apiError.data?.statusMessage,
		apiError.statusMessage,
		apiError.message,
	]

	return candidates.find(isErrorCode) ?? null
}

const resolveStatusCode = (error: unknown): number | null => {
	if (typeof error !== 'object' || !error) {
		return null
	}

	const apiError = error as ApiErrorLike
	const statusCode = apiError.statusCode ?? apiError.status

	return typeof statusCode === 'number' ? statusCode : null
}

export const useApiError = () => {
	const { $i18n } = useNuxtApp()
	const t = ($i18n as Composer).t as (key: string) => string
	const te = ($i18n as Composer).te as (key: string) => boolean

	const getErrorCode = (error: unknown): string => {
		const code = normalizeErrorCode(error)

		if (code) {
			return code
		}

		const statusCode = resolveStatusCode(error)

		if (statusCode === 401) {
			return 'AUTHENTICATION_REQUIRED'
		}

		if (statusCode === 403) {
			return 'FORBIDDEN'
		}

		if (statusCode === 404) {
			return 'NOT_FOUND'
		}

		if (statusCode === 429) {
			return 'TOO_MANY_REQUESTS'
		}

		if (statusCode && statusCode >= 500) {
			return 'INTERNAL_SERVER_ERROR'
		}

		return 'UNEXPECTED_ERROR'
	}

	const getErrorMessage = (error: unknown): string => {
		const code = getErrorCode(error)
		const key = `errors.codes.${code}`

		return te(key) ? t(key) : t('errors.codes.UNEXPECTED_ERROR')
	}

	return {
		getErrorCode,
		getErrorMessage,
	}
}
