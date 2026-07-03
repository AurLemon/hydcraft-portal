export type PortalUserRole = 'USER' | 'MEMBER' | 'ADMIN' | 'OWNER'
export type PortalUserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'BANNED'
export type PortalProfileLanguage = 'ZH_CN' | 'ZH_TW' | 'EN_US' | 'JA_JP'

export interface PortalIpLocationSummary {
	raw: string | null
	country: string | null
	countryCode: string | null
	region: string | null
	province: string | null
	city: string | null
	district: string | null
	isp: string | null
	display: string | null
}

export interface PortalUserPreferencesSummary {
	language: PortalProfileLanguage
}

export interface PortalUserSummary {
	id: string
	handle: string
	username: string
	hydrolineId: string
	displayName: string | null
	email: string | null
	avatarUrl: string | null
	coverUrl: string | null
	bio: string | null
	role: PortalUserRole
	status: PortalUserStatus
	lastLoginAt: string | null
	createdAt: string
	updatedAt: string
	preferences: PortalUserPreferencesSummary | null
}

interface PortalAuthMeResponse {
	user: PortalUserSummary
}

interface PortalLoginBody {
	handleOrEmail: string
	password: string
	captchaToken?: string
}

interface PortalMinecraftLoginBody {
	username: string
	password: string
	captchaToken?: string
}

interface PortalRegisterBody {
	handle: string
	password: string
	email: string
	code: string
}

interface PortalMinecraftRegisterTicketBody {
	username: string
	password: string
	captchaToken?: string
}

interface PortalBindMinecraftAccountBody {
	username: string
	password: string
	captchaToken?: string
}

interface PortalUnbindMinecraftAccountBody {
	captchaToken?: string
}

interface PortalRegistrationCompleteBody {
	ticketToken: string
	handle: string
	email: string
	code?: string
}

interface PortalPasswordResetRequestBody {
	email: string
	locale?: string
	captchaToken?: string
}

interface PortalPasswordResetBody {
	token: string
	password: string
}

interface PortalPasswordResetRequestResponse {
	accepted: boolean
}

interface PortalEmailCodeLoginRequestBody {
	email: string
	intent: 'LOGIN' | 'REGISTER'
	locale?: string
	captchaToken?: string
}

interface PortalEmailCodeLoginBody {
	email: string
	code: string
	intent: 'LOGIN' | 'REGISTER'
}

interface PortalUsernameAvailabilityResponse {
	username: string
	available: boolean
}

interface PortalMinecraftRegistrationAccountSummary {
	id: string
	username: string | null
	realname: string | null
	displayName: string | null
	uuid: string | null
	registeredAt: string | null
	lastLoginAt: string | null
	registerIp: string | null
	lastIp: string | null
	registerIpLocation: PortalIpLocationSummary | null
	lastIpLocation: PortalIpLocationSummary | null
}

interface PortalOAuthRegistrationSummary {
	provider: string | null
	providerAccountId: string | null
	providerUsername: string | null
	providerEmail: string | null
	avatarUrl: string | null
}

interface PortalGameRegistrationTicketSummary {
	kind: 'GAME_ACCOUNT'
	token: string
	expiresAt: string
	account: PortalMinecraftRegistrationAccountSummary | null
}

interface PortalOAuthRegistrationTicketSummary {
	kind: 'OAUTH'
	token: string
	expiresAt: string
	oauth: PortalOAuthRegistrationSummary
}

export type PortalRegistrationTicketSummary =
	| PortalGameRegistrationTicketSummary
	| PortalOAuthRegistrationTicketSummary

interface PortalRegistrationTicketResponse {
	ticket: PortalRegistrationTicketSummary
}

interface PortalMinecraftRegisterTicketResponse {
	registrationToken: string
	account: PortalMinecraftRegistrationAccountSummary
}

const isUnauthorizedError = (error: unknown): boolean =>
	typeof error === 'object' &&
	error !== null &&
	'statusCode' in error &&
	(error as { statusCode?: number }).statusCode === 401

export const usePortalAuth = () => {
	const user = useState<PortalUserSummary | null>(
		'portal-auth:user',
		() => null,
	)
	const pending = useState<boolean>('portal-auth:pending', () => false)
	const resolved = useState<boolean>('portal-auth:resolved', () => false)

	const isLoggedIn = computed(() => Boolean(user.value))
	const isAdmin = computed(
		() => user.value?.role === 'OWNER' || user.value?.role === 'ADMIN',
	)

	const fetchCurrentUser = async (): Promise<PortalUserSummary | null> => {
		pending.value = true
		const requestFetch = import.meta.server ? useRequestFetch() : $fetch

		try {
			const response = await requestFetch<PortalAuthMeResponse>('/api/auth/me')
			user.value = response.user
			return response.user
		} catch (error) {
			if (!isUnauthorizedError(error)) {
				user.value = null
				return null
			}

			try {
				const response = await requestFetch<PortalAuthMeResponse>(
					'/api/auth/refresh',
					{
						method: 'POST',
					},
				)
				user.value = response.user
				return response.user
			} catch {
				user.value = null
				return null
			}
		} finally {
			pending.value = false
			resolved.value = true
		}
	}

	const login = async (body: PortalLoginBody): Promise<PortalUserSummary> => {
		const response = await $fetch<PortalAuthMeResponse>('/api/auth/login', {
			method: 'POST',
			body,
		})
		user.value = response.user
		resolved.value = true
		return response.user
	}

	const loginWithMinecraft = async (
		body: PortalMinecraftLoginBody,
	): Promise<PortalUserSummary> => {
		const response = await $fetch<PortalAuthMeResponse>(
			'/api/auth/minecraft/login',
			{
				method: 'POST',
				body,
			},
		)
		user.value = response.user
		resolved.value = true
		return response.user
	}

	const register = async (
		body: PortalRegisterBody,
	): Promise<PortalUserSummary> => {
		const response = await $fetch<PortalAuthMeResponse>('/api/auth/register', {
			method: 'POST',
			body,
		})
		user.value = response.user
		resolved.value = true
		return response.user
	}

	const requestMinecraftRegisterTicket = async (
		body: PortalMinecraftRegisterTicketBody,
	): Promise<PortalMinecraftRegisterTicketResponse> => {
		return await $fetch<PortalMinecraftRegisterTicketResponse>(
			'/api/auth/minecraft/register-ticket',
			{
				method: 'POST',
				body,
			},
		)
	}

	const bindMinecraftAccount = async (
		body: PortalBindMinecraftAccountBody,
	): Promise<void> => {
		await $fetch('/api/users/me/minecraft-accounts', {
			method: 'POST',
			body,
		})
	}

	const unbindMinecraftAccount = async (
		accountId: string,
		body: PortalUnbindMinecraftAccountBody,
	): Promise<void> => {
		await $fetch(`/api/users/me/minecraft-accounts/${accountId}`, {
			method: 'DELETE',
			body,
		})
	}

	const getRegistrationTicket = async (
		token: string,
	): Promise<PortalRegistrationTicketSummary> => {
		const response = await $fetch<PortalRegistrationTicketResponse>(
			'/api/auth/registration-ticket',
			{
				query: {
					token,
				},
			},
		)

		return response.ticket
	}

	const completeRegistrationWithTicket = async (
		body: PortalRegistrationCompleteBody,
	): Promise<PortalUserSummary> => {
		const response = await $fetch<PortalAuthMeResponse>(
			'/api/auth/registration/complete',
			{
				method: 'POST',
				body,
			},
		)
		user.value = response.user
		resolved.value = true
		return response.user
	}

	const requestEmailCodeLogin = async (
		body: PortalEmailCodeLoginRequestBody,
	): Promise<void> => {
		await $fetch('/api/auth/email-code/request', {
			method: 'POST',
			body,
		})
	}

	const checkUsernameAvailability = async (
		username: string,
	): Promise<PortalUsernameAvailabilityResponse> => {
		return await $fetch<PortalUsernameAvailabilityResponse>(
			'/api/users/check-username',
			{
				query: {
					username,
				},
			},
		)
	}

	const loginWithEmailCode = async (
		body: PortalEmailCodeLoginBody,
	): Promise<PortalUserSummary> => {
		const response = await $fetch<PortalAuthMeResponse>(
			'/api/auth/email-code/confirm',
			{
				method: 'POST',
				body,
			},
		)
		user.value = response.user
		resolved.value = true
		return response.user
	}

	const requestPasswordReset = async (
		body: PortalPasswordResetRequestBody,
	): Promise<PortalPasswordResetRequestResponse> => {
		return await $fetch<PortalPasswordResetRequestResponse>(
			'/api/auth/password-reset/request',
			{
				method: 'POST',
				body,
			},
		)
	}

	const resetPassword = async (
		body: PortalPasswordResetBody,
	): Promise<void> => {
		await $fetch('/api/auth/password-reset/confirm', {
			method: 'POST',
			body,
		})
	}

	const logout = async (): Promise<void> => {
		await $fetch('/api/auth/logout', {
			method: 'POST',
		})
		user.value = null
		resolved.value = true
	}

	return {
		user,
		pending,
		resolved,
		isLoggedIn,
		isAdmin,
		fetchCurrentUser,
		login,
		loginWithMinecraft,
		register,
		requestMinecraftRegisterTicket,
		bindMinecraftAccount,
		unbindMinecraftAccount,
		getRegistrationTicket,
		completeRegistrationWithTicket,
		requestEmailCodeLogin,
		checkUsernameAvailability,
		loginWithEmailCode,
		requestPasswordReset,
		resetPassword,
		logout,
	}
}
