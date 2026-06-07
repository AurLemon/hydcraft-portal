import type { RouteLocationNormalizedLoaded } from 'vue-router'

export const heroVideoBackgroundRouteNames = new Set([
	'index',
	'login',
	'register',
	'forgot-password',
	'reset-password',
])

export const getRouteBaseName = (
	route: Pick<RouteLocationNormalizedLoaded, 'name'>,
): string => {
	const routeName = String(route.name ?? '')
	return routeName.split('___', 1)[0] ?? ''
}

export const hasHeroVideoBackground = (
	route: Pick<RouteLocationNormalizedLoaded, 'name'>,
): boolean => heroVideoBackgroundRouteNames.has(getRouteBaseName(route))
