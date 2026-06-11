import { getPortalRedirectQuery } from '~/utils/auth/redirect'

export default defineNuxtRouteMiddleware(async (to) => {
	const localePath = useLocalePath()
	const { fetchCurrentUser, isAdmin } = usePortalAuth()
	const user = await fetchCurrentUser()

	if (!user) {
		return navigateTo({
			path: localePath('/login'),
			query: getPortalRedirectQuery(to.fullPath, {
				fallbackPath: localePath('/'),
				loginPath: localePath('/login'),
			}),
		})
	}

	if (!isAdmin.value) {
		return abortNavigation(
			createError({
				statusCode: 403,
				statusMessage: 'ADMIN_ROLE_REQUIRED',
				message: 'ADMIN_ROLE_REQUIRED',
			}),
		)
	}
})
