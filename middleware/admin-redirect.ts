export default defineNuxtRouteMiddleware(() => {
	const localePath = useLocalePath()

	return navigateTo(localePath('/admin/overview'), {
		replace: true,
		redirectCode: 301,
	})
})
