export interface AfdianRuntimeConfig {
	userId: string | null
	apiKey: string | null
	baseUrl: string
}

const trimOptional = (value: string | null | undefined): string | null => {
	const normalized = value?.trim()
	return normalized ? normalized : null
}

const normalizeBaseUrl = (value: string | null | undefined): string => {
	const normalized = value?.trim() || 'https://afdian.com'
	return normalized.replace(/\/$/, '')
}

export const getAfdianRuntimeConfig = (): AfdianRuntimeConfig => {
	const runtimeConfig = useRuntimeConfig()
	const config = runtimeConfig.afdian as
		| {
				userId?: string
				apiKey?: string
				baseUrl?: string
		  }
		| undefined

	return {
		userId: trimOptional(config?.userId),
		apiKey: trimOptional(config?.apiKey),
		baseUrl: normalizeBaseUrl(config?.baseUrl),
	}
}

export const isAfdianRuntimeConfigured = (
	config = getAfdianRuntimeConfig(),
): boolean => Boolean(config.userId && config.apiKey)
