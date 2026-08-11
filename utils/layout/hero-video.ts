import type { RouteLocationNormalizedLoaded } from 'vue-router'

export const heroVideoBackgroundRouteNames = new Set([
	'login',
	'register',
	'forgot-password',
	'reset-password',
])

export const heroVideoBackgroundPaths = new Set([
	'/login',
	'/register',
	'/forgot-password',
	'/reset-password',
])

export const getRouteBaseName = (
	route: Pick<RouteLocationNormalizedLoaded, 'name'>,
): string => {
	const routeName = String(route.name ?? '')
	return routeName.split('___', 1)[0] ?? ''
}

export const getNormalizedRoutePath = (
	route: Pick<RouteLocationNormalizedLoaded, 'path'>,
): string => {
	const path = String(route.path ?? '').trim()

	if (!path) {
		return ''
	}

	const normalizedPath = path.replace(/^\/(?:zh-TW|ja-JP|en-US)(?=\/|$)/, '')

	return normalizedPath || '/'
}

export const hasHeroVideoBackground = (
	route: Pick<RouteLocationNormalizedLoaded, 'name' | 'path'>,
): boolean => {
	// SSR 首屏和客户端路由切换时，route.name 可能出现短暂不一致；path 更稳定。
	if (heroVideoBackgroundPaths.has(getNormalizedRoutePath(route))) {
		return true
	}

	return heroVideoBackgroundRouteNames.has(getRouteBaseName(route))
}
