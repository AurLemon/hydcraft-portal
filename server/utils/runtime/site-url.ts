import { useRuntimeConfig } from '#imports'
import { createApiError } from '../errors'

const normalizeConfiguredUrl = (value: string, reason: string): string => {
	try {
		const url = new URL(value)
		if (
			!['http:', 'https:'].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		)
			throw new Error()
		return url.toString().replace(/\/$/, '')
	} catch {
		throw createApiError({
			statusCode: 500,
			code: 'INTERNAL_SERVER_ERROR',
			data: { reason },
		})
	}
}

export const getPublicSiteOrigin = (): string => {
	const configuredSiteUrl = String(
		useRuntimeConfig().public.siteUrl ?? '',
	).trim()
	const normalizedSiteUrl = normalizeConfiguredUrl(
		configuredSiteUrl,
		'PUBLIC_SITE_URL_INVALID',
	)

	return new URL(normalizedSiteUrl).origin
}

export const getOAuthIssuerUrl = (): string => {
	const configuredIssuer = process.env.OAUTH_ISSUER_URL?.trim()

	return configuredIssuer
		? normalizeConfiguredUrl(configuredIssuer, 'OAUTH_ISSUER_URL_INVALID')
		: getPublicSiteOrigin()
}
