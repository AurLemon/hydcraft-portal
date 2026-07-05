import type { ExternalProvider, Prisma } from '~/generated/prisma/client'

export interface OAuthUserProfile {
	id: string
	username: string | null
	email: string | null
	avatarUrl: string | null
	raw: Prisma.InputJsonObject
}

export interface OAuthProviderConfig {
	provider: ExternalProvider
	label: string
	icon: string
	logoUrl?: string
	proxyEnabled: boolean
	clientId: string
	clientSecret: string
	redirectUri: string
	authorizeUrl: string
	tokenUrl: string
	userUrl: string
	scopes: string[]
	mapProfile: (raw: Prisma.InputJsonObject) => OAuthUserProfile
}

export interface OAuthProviderDefinition {
	provider: ExternalProvider
	label: string
	icon: string
	logoUrl?: string
	clientIdEnv: string
	clientSecretEnv: string
	redirectUriEnv: string
	proxyEnabledEnv?: string
	authorizeUrl: string
	tokenUrl: string
	userUrl: string
	scopes: string[]
	mapProfile: (raw: Prisma.InputJsonObject) => OAuthUserProfile
}

export interface OAuthProviderSummary {
	provider: ExternalProvider
	label: string
	icon: string
	logoUrl?: string
	configured: boolean
}

const readString = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null

const readBoolean = (value: unknown): boolean =>
	typeof value === 'string' &&
	['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())

const hasOAuthProxyConfig = (): boolean =>
	Boolean(
		(readString(process.env.OAUTH_PROXY_URL) ??
			readString(process.env.PROXY_URL)) &&
		(readString(process.env.OAUTH_PROXY_KEY) ??
			readString(process.env.PROXY_KEY)),
	)

const getBaseUrl = (): string =>
	(process.env.NUXT_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const oauthProviderDefinitions = [
	{
		provider: 'GITHUB',
		label: 'GitHub',
		icon: 'i-lucide-github',
		clientIdEnv: 'GITHUB_OAUTH_CLIENT_ID',
		clientSecretEnv: 'GITHUB_OAUTH_CLIENT_SECRET',
		redirectUriEnv: 'GITHUB_OAUTH_REDIRECT_URI',
		proxyEnabledEnv: 'GITHUB_OAUTH_PROXY_ENABLED',
		authorizeUrl: 'https://github.com/login/oauth/authorize',
		tokenUrl: 'https://github.com/login/oauth/access_token',
		userUrl: 'https://api.github.com/user',
		scopes: ['read:user', 'user:email'],
		mapProfile: (raw) => ({
			id: String(raw.id),
			username: readString(raw.login),
			email: readString(raw.email),
			avatarUrl: readString(raw.avatar_url),
			raw,
		}),
	},
	{
		provider: 'GOOGLE',
		label: 'Google',
		icon: 'i-lucide-chrome',
		logoUrl: '/brands/google_logo.svg',
		clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
		clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
		redirectUriEnv: 'GOOGLE_OAUTH_REDIRECT_URI',
		proxyEnabledEnv: 'GOOGLE_OAUTH_PROXY_ENABLED',
		authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		tokenUrl: 'https://oauth2.googleapis.com/token',
		userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
		scopes: ['openid', 'email', 'profile'],
		mapProfile: (raw) => ({
			id: String(raw.sub),
			username: readString(raw.name),
			email: readString(raw.email),
			avatarUrl: readString(raw.picture),
			raw,
		}),
	},
	{
		provider: 'MICROSOFT',
		label: 'Microsoft',
		icon: 'i-lucide-panels-top-left',
		logoUrl: '/brands/microsoft_logo.svg',
		clientIdEnv: 'MICROSOFT_OAUTH_CLIENT_ID',
		clientSecretEnv: 'MICROSOFT_OAUTH_CLIENT_SECRET',
		redirectUriEnv: 'MICROSOFT_OAUTH_REDIRECT_URI',
		authorizeUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_OAUTH_TENANT_ID ?? 'common'}/oauth2/v2.0/authorize`,
		tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_OAUTH_TENANT_ID ?? 'common'}/oauth2/v2.0/token`,
		userUrl: 'https://graph.microsoft.com/oidc/userinfo',
		scopes: ['openid', 'email', 'profile', 'User.Read'],
		mapProfile: (raw) => ({
			id: String(raw.sub),
			username: readString(raw.name),
			email: readString(raw.email) ?? readString(raw.preferred_username),
			avatarUrl: null,
			raw,
		}),
	},
	{
		provider: 'QQ',
		label: 'QQ',
		icon: 'i-lucide-message-circle',
		logoUrl: '/brands/qq_logo.png',
		clientIdEnv: 'QQ_OAUTH_CLIENT_ID',
		clientSecretEnv: 'QQ_OAUTH_CLIENT_SECRET',
		redirectUriEnv: 'QQ_OAUTH_REDIRECT_URI',
		authorizeUrl: 'https://graph.qq.com/oauth2.0/authorize',
		tokenUrl: 'https://graph.qq.com/oauth2.0/token',
		userUrl: 'https://graph.qq.com/user/get_user_info',
		scopes: ['get_user_info'],
		mapProfile: (raw) => ({
			id: readString(raw.openid) ?? '',
			username: readString(raw.nickname),
			email: null,
			avatarUrl:
				readString(raw.figureurl_qq_2) ?? readString(raw.figureurl_qq_1),
			raw,
		}),
	},
] satisfies OAuthProviderDefinition[]

export type OAuthLoginProvider =
	(typeof oauthProviderDefinitions)[number]['provider']

export const getOAuthProviderDefinitions =
	(): readonly OAuthProviderDefinition[] => oauthProviderDefinitions

export const getOAuthProviderDefinition = (
	provider: ExternalProvider,
): OAuthProviderDefinition | null =>
	oauthProviderDefinitions.find((item) => item.provider === provider) ?? null

export const isOAuthLoginProvider = (
	provider: ExternalProvider,
): provider is OAuthLoginProvider =>
	Boolean(getOAuthProviderDefinition(provider))

export const getOAuthProviderSummary = (
	definition: OAuthProviderDefinition,
): OAuthProviderSummary => ({
	provider: definition.provider,
	label: definition.label,
	icon: definition.icon,
	logoUrl: definition.logoUrl,
	configured: Boolean(
		process.env[definition.clientIdEnv] &&
		process.env[definition.clientSecretEnv] &&
		(!readBoolean(process.env[definition.proxyEnabledEnv ?? '']) ||
			hasOAuthProxyConfig()),
	),
})

const getFallbackOAuthRedirectUri = (provider: ExternalProvider): string =>
	`${getBaseUrl()}/api/auth/oauth/${provider.toLowerCase()}/callback`

export const getOAuthRedirectUri = (provider: ExternalProvider): string => {
	const definition = getOAuthProviderDefinition(provider)
	const configuredRedirectUri = definition
		? readString(process.env[definition.redirectUriEnv])
		: null

	return configuredRedirectUri ?? getFallbackOAuthRedirectUri(provider)
}

export const getOAuthProviderConfig = (
	provider: ExternalProvider,
): OAuthProviderConfig | null => {
	const definition = getOAuthProviderDefinition(provider)

	if (!definition) {
		return null
	}

	const clientId = process.env[definition.clientIdEnv]
	const clientSecret = process.env[definition.clientSecretEnv]

	if (!clientId || !clientSecret) {
		return null
	}

	return {
		provider: definition.provider,
		label: definition.label,
		icon: definition.icon,
		logoUrl: definition.logoUrl,
		proxyEnabled: readBoolean(process.env[definition.proxyEnabledEnv ?? '']),
		clientId,
		clientSecret,
		redirectUri: getOAuthRedirectUri(provider),
		authorizeUrl: definition.authorizeUrl,
		tokenUrl: definition.tokenUrl,
		userUrl: definition.userUrl,
		scopes: definition.scopes,
		mapProfile: definition.mapProfile,
	}
}

export const parseOAuthProvider = (
	value: string | null | undefined,
): ExternalProvider | null => {
	const provider = value?.toUpperCase() as ExternalProvider | undefined

	if (provider && isOAuthLoginProvider(provider)) {
		return provider
	}

	return null
}
