import { getPortalRedirectQuery } from '~/utils/auth/redirect'

export default defineNuxtRouteMiddleware(async (to) => {
	const localePath = useLocalePath()
	const { fetchCurrentUser } = usePortalAuth()
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
})
