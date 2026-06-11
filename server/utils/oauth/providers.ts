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
	clientId: string
	clientSecret: string
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
	clientIdEnv: string
	clientSecretEnv: string
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
	configured: boolean
}

const readString = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null

const getBaseUrl = (): string =>
	(process.env.NUXT_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const oauthProviderDefinitions = [
	{
		provider: 'GITHUB',
		label: 'GitHub',
		icon: 'i-lucide-github',
		clientIdEnv: 'GITHUB_OAUTH_CLIENT_ID',
		clientSecretEnv: 'GITHUB_OAUTH_CLIENT_SECRET',
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
		provider: 'QQ',
		label: 'QQ',
		icon: 'i-lucide-message-circle',
		clientIdEnv: 'QQ_OAUTH_CLIENT_ID',
		clientSecretEnv: 'QQ_OAUTH_CLIENT_SECRET',
		authorizeUrl: 'https://graph.qq.com/oauth2.0/authorize',
		tokenUrl: 'https://graph.qq.com/oauth2.0/token',
		userUrl: 'https://graph.qq.com/user/get_user_info',
		scopes: ['get_user_info'],
		mapProfile: (raw) => ({
			id: String(raw.openid),
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
	configured: Boolean(
		process.env[definition.clientIdEnv] &&
		process.env[definition.clientSecretEnv],
	),
})

export const getOAuthRedirectUri = (provider: ExternalProvider): string =>
	`${getBaseUrl()}/api/auth/oauth/${provider.toLowerCase()}/callback`

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
		clientId,
		clientSecret,
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
