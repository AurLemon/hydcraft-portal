export interface HeaderMenuItem {
	key: string
	labelKey: string
	to: string
	icon?: string
}

export interface HeaderMenuGroup {
	key: string
	parentKey: string | null
	items: HeaderMenuItem[]
	match?: (path: string) => boolean
}

export const normalizeHeaderMenuPath = (path: string): string => {
	const [pathname = '/'] = path.split(/[?#]/, 1)
	const matched = pathname.match(/^\/(?:zh-CN|zh-TW|ja-JP|en-US)(?=\/|$)(.*)$/)

	if (!matched) {
		return pathname || '/'
	}

	return matched[1] ? `/${matched[1].replace(/^\/+/, '')}` : '/'
}

export const mainHeaderMenuGroup: HeaderMenuGroup = {
	key: 'main',
	parentKey: null,
	items: [
		{ key: 'entry', labelKey: 'routes.entry', to: '/' },
		{ key: 'intro', labelKey: 'routes.intro', to: '/intro' },
		{ key: 'server', labelKey: 'routes.server', to: '/server' },
		{ key: 'timeline', labelKey: 'routes.timeline', to: '/timeline' },
		{ key: 'about', labelKey: 'routes.about', to: '/about' },
	],
}

export const isServerDirectoryDetailPath = (path: string): boolean => {
	const normalizedPath = normalizeHeaderMenuPath(path)

	return (
		/^\/players\/[^/]+$/.test(normalizedPath) ||
		/^\/u\/[^/]+$/.test(normalizedPath)
	)
}

export const matchesServerDirectoriesGroupPath = (path: string): boolean => {
	const normalizedPath = normalizeHeaderMenuPath(path)

	return (
		normalizedPath === '/server/users' ||
		normalizedPath === '/server/players' ||
		normalizedPath === '/server/charter' ||
		normalizedPath === '/server/community-covenant' ||
		isServerDirectoryDetailPath(normalizedPath)
	)
}

export const headerMenuGroups: HeaderMenuGroup[] = [
	mainHeaderMenuGroup,
	{
		key: 'server-directories',
		parentKey: 'main',
		match: matchesServerDirectoriesGroupPath,
		items: [
			{ key: 'server-overview', labelKey: 'routes.server', to: '/server' },
			{
				key: 'server-users',
				labelKey: 'routes.serverUsers',
				to: '/server/users',
			},
			{
				key: 'server-players',
				labelKey: 'routes.serverPlayers',
				to: '/server/players',
			},
			{
				key: 'server-charter',
				labelKey: 'routes.serverCharter',
				to: '/server/charter',
			},
			{
				key: 'server-community-covenant',
				labelKey: 'routes.serverCommunityCovenant',
				to: '/server/community-covenant',
			},
		],
	},
	{
		key: 'me',
		parentKey: 'main',
		match: (path) => path === '/me' || path.startsWith('/me/'),
		items: [
			{ key: 'profile', labelKey: 'routes.meProfile', to: '/me/profile' },
			{
				key: 'minecraft',
				labelKey: 'routes.meMinecraft',
				to: '/me/minecraft',
			},
			{ key: 'security', labelKey: 'routes.meSecurity', to: '/me/security' },
			{
				key: 'connections',
				labelKey: 'routes.meConnections',
				to: '/me/connections',
			},
		],
	},
	{
		key: 'admin',
		parentKey: 'main',
		match: (path) => path === '/admin' || path.startsWith('/admin/'),
		items: [
			{
				key: 'overview',
				labelKey: 'routes.adminOverview',
				to: '/admin/overview',
			},
			{
				key: 'servers',
				labelKey: 'routes.adminServers',
				to: '/admin/servers',
			},
			{
				key: 'players',
				labelKey: 'routes.adminPlayers',
				to: '/admin/players',
			},
			{ key: 'users', labelKey: 'routes.adminUsers', to: '/admin/users' },
			{
				key: 'partners',
				labelKey: 'routes.adminPartners',
				to: '/admin/partners',
			},
			{
				key: 'links',
				labelKey: 'routes.adminLinks',
				to: '/admin/links',
			},
			{
				key: 'achievements',
				labelKey: 'routes.adminAchievements',
				to: '/admin/achievements',
			},
			{
				key: 'attachments',
				labelKey: 'routes.adminAttachments',
				to: '/admin/attachments',
			},
		],
	},
]

export const headerMenuFallbackLabelKeys: Record<string, string> = {
	'/': 'routes.entry',
	'/intro': 'routes.intro',
	'/server': 'routes.server',
	'/server/users': 'routes.serverUsers',
	'/server/players': 'routes.serverPlayers',
	'/server/charter': 'routes.serverCharter',
	'/server/community-covenant': 'routes.serverCommunityCovenant',
	'/timeline': 'routes.timeline',
	'/story': 'routes.timeline',
	'/overview': 'routes.overview',
	'/about': 'routes.about',
	'/links': 'routes.links',
	'/partners': 'routes.partners',
	'/admin': 'routes.admin',
	'/admin/overview': 'routes.adminOverview',
	'/admin/servers': 'routes.adminServers',
	'/admin/players': 'routes.adminPlayers',
	'/admin/users': 'routes.adminUsers',
	'/admin/partners': 'routes.adminPartners',
	'/admin/links': 'routes.adminLinks',
	'/admin/achievements': 'routes.adminAchievements',
	'/admin/attachments': 'routes.adminAttachments',
	'/me/profile': 'routes.meProfile',
	'/me/minecraft': 'routes.meMinecraft',
	'/me/security': 'routes.meSecurity',
	'/me/connections': 'routes.meConnections',
	'/login': 'routes.login',
	'/register': 'routes.register',
	'/forgot-password': 'routes.forgotPassword',
	'/reset-password': 'routes.resetPassword',
}

export const findHeaderMenuGroupByKey = (
	key: string,
): HeaderMenuGroup | undefined =>
	headerMenuGroups.find((group) => group.key === key)

export const findHeaderMenuGroupByPath = (
	path: string,
): HeaderMenuGroup | undefined => {
	const normalizedPath = normalizeHeaderMenuPath(path)

	return headerMenuGroups.find((group) => group.match?.(normalizedPath))
}

export const isPathInHeaderMenuGroup = (
	group: HeaderMenuGroup,
	path: string,
): boolean => {
	const normalizedPath = normalizeHeaderMenuPath(path)

	return group.items.some((item) => {
		if (item.to === '/') {
			return normalizedPath === '/'
		}

		return (
			normalizedPath === item.to || normalizedPath.startsWith(`${item.to}/`)
		)
	})
}
