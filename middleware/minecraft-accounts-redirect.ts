export default defineNuxtRouteMiddleware(() => {
	const localePath = useLocalePath()

	return navigateTo(localePath('/me/minecraft'), {
		replace: true,
		redirectCode: 301,
	})
})
