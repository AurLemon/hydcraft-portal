import { computed, onBeforeUnmount, watch } from 'vue'
import {
	headerMenuFallbackLabelKeys,
	normalizeHeaderMenuPath,
} from './header-menu'

export interface RouteDisplayTitleDefinition {
	key: string
	labelKey: string
}

export interface HeaderRouteBadge {
	type: 'minecraft-player' | 'user-profile'
	labelKey: string
	avatarUrl: string | null
	fallbackText?: string | null
}

const dynamicRouteTitleDefinitions: ReadonlyArray<RouteDisplayTitleDefinition> =
	[
		{
			key: '/players/[mcid]',
			labelKey: 'routes.playerPage',
		},
		{
			key: '/u/[username]',
			labelKey: 'routes.userPage',
		},
	]

export const resolveRouteTitleDefinition = (
	path: string,
	matchedPaths: string[],
): RouteDisplayTitleDefinition | null => {
	const normalizedPath = normalizeHeaderMenuPath(path)
	const directLabelKey = headerMenuFallbackLabelKeys[normalizedPath]

	if (directLabelKey) {
		return {
			key: normalizedPath,
			labelKey: directLabelKey,
		}
	}

	const matchedPathSet = new Set(
		matchedPaths
			.map((matchedPath) => normalizeHeaderMenuPath(matchedPath))
			.filter(Boolean),
	)

	for (const definition of dynamicRouteTitleDefinitions) {
		if (matchedPathSet.has(definition.key)) {
			return definition
		}
	}

	if (/^\/players\/[^/]+$/.test(normalizedPath)) {
		return {
			key: '/players/[mcid]',
			labelKey: 'routes.playerPage',
		}
	}

	if (/^\/u\/[^/]+$/.test(normalizedPath)) {
		return {
			key: '/u/[username]',
			labelKey: 'routes.userPage',
		}
	}

	return null
}

const defaultHeaderRouteBadge = (): HeaderRouteBadge | null => null
const defaultExplicitRouteTitle = (): string | null => null

export const useHeaderRouteBadgeState = () =>
	useState<HeaderRouteBadge | null>(
		'header-route-badge',
		defaultHeaderRouteBadge,
	)

export const useExplicitRouteTitleState = () =>
	useState<string | null>('explicit-route-title', defaultExplicitRouteTitle)

export const useHeaderRouteBadge = (
	badge: Ref<HeaderRouteBadge | null> | ComputedRef<HeaderRouteBadge | null>,
): void => {
	const state = useHeaderRouteBadgeState()

	watch(
		badge,
		(value) => {
			state.value = value
		},
		{ immediate: true },
	)
}

export const useExplicitRouteTitle = (
	title: Ref<string | null> | ComputedRef<string | null>,
): void => {
	const state = useExplicitRouteTitleState()

	watch(
		title,
		(value) => {
			state.value = value
		},
		{ immediate: true },
	)

	onBeforeUnmount(() => {
		if (state.value === title.value) {
			state.value = null
		}
	})
}

export const useResolvedRouteTitleDefinition = () => {
	const route = useRoute()

	return computed<RouteDisplayTitleDefinition | null>(() =>
		resolveRouteTitleDefinition(
			route.path,
			route.matched
				.map((record) => record.path)
				.filter((matchedPath): matchedPath is string => Boolean(matchedPath)),
		),
	)
}
