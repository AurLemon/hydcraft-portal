export default defineNuxtRouteMiddleware(() => {
	const localePath = useLocalePath()

	return navigateTo(localePath('/server/overview'), {
		replace: true,
		redirectCode: 301,
	})
})
