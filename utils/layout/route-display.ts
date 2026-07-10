import { computed, onBeforeUnmount, watch } from 'vue'
import {
	headerMenuFallbackLabelKeys,
	normalizeHeaderMenuPath,
} from './header-menu'

export interface RouteDisplayTitleDefinition {
	key: string
	labelKey: string
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
		{
			key: '/admin/users/[id]',
			labelKey: 'routes.adminUserEdit',
		},
		{
			key: '/admin/servers/[serverId]',
			labelKey: 'routes.adminServerEdit',
		},
	]

const staticAdminServerPaths = new Set([
	'/admin/servers/stats',
	'/admin/servers/advancements',
])

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

	if (/^\/admin\/users\/[^/]+$/.test(normalizedPath)) {
		return {
			key: '/admin/users/[id]',
			labelKey: 'routes.adminUserEdit',
		}
	}

	if (
		/^\/admin\/servers\/[^/]+$/.test(normalizedPath) &&
		!staticAdminServerPaths.has(normalizedPath)
	) {
		return {
			key: '/admin/servers/[serverId]',
			labelKey: 'routes.adminServerEdit',
		}
	}

	return null
}

const defaultExplicitRouteTitle = (): string | null => null

export const useExplicitRouteTitleState = () =>
	useState<string | null>('explicit-route-title', defaultExplicitRouteTitle)

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
