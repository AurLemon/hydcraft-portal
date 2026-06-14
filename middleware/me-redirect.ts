export default defineNuxtRouteMiddleware(() => {
	const localePath = useLocalePath()

	return navigateTo(localePath('/me/profile'), {
		replace: true,
		redirectCode: 301,
	})
})
