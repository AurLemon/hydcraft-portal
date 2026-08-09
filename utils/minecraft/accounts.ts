import {
	resolveMinecraftServerLocalizedName,
	type MinecraftServerLocalizedName,
} from './server-name'

export interface MinecraftLocationSummary {
	worldName: string | null
	dimension: string | null
	x: number | null
	y: number | null
	z: number | null
	yaw?: number | null
	pitch?: number | null
	observedAt: string | null
}

export interface MinecraftLastLoginSummary {
	at: string | null
	ipAddress: string | null
	ipLocation: string | null
}

export interface MinecraftRegistrationSummary {
	at: string | null
	ipAddress: string | null
	ipLocation: string | null
}

export interface MinecraftObservedPlayerSummary {
	serverId: string
	serverNames: MinecraftServerLocalizedName | null
	serverHasBlueMap: boolean
	uuid: string
	username: string | null
	online: boolean
	lastSeenAt: string | null
	lastPlayedAt: string | null
	luckPermsPrimaryGroup: string | null
	playerProfile: {
		firstPlayedAt: string | null
		lastPlayedAt: string | null
		hasStats: boolean
		hasAdvancements: boolean
		statsCount: number
		advancementsTotalCount: number
		advancementsCompletedCount: number
		distanceTraveledCm: number
		deaths: number
		leaveCount: number
		playTimeTicks: number
	}
	lastSavedLocation: MinecraftLocationSummary | null
}

export interface MinecraftAccountServerView {
	id: string
	serverId: string | null
	serverNames: MinecraftServerLocalizedName | null
	uuid: string | null
	label: string
	hasMap: boolean
	blueMapConfig: {
		assetsBaseUrl: string
		defaultAssetsBaseUrl: string
		dimensions: string[]
	} | null
	online: boolean
	firstJoinedAt: string | null
	lastSeenAt: string | null
	luckPermsPrimaryGroup: string | null
	playerProfile: {
		firstPlayedAt: string | null
		lastPlayedAt: string | null
		hasStats: boolean
		hasAdvancements: boolean
		statsCount: number
		advancementsTotalCount: number
		advancementsCompletedCount: number
		distanceTraveledCm: number
		deaths: number
		leaveCount: number
		playTimeTicks: number
	}
	presence: {
		online: boolean
		lastSavedLocation: MinecraftLocationSummary | null
	} | null
}

export interface MinecraftAccountSummary {
	id: string
	username: string
	normalizedUsername: string
	uuid: string | null
	status: string
	source: string
	identityKind: string
	assignmentMode: string
	authmeName: string | null
	authmeId: number | null
	authmeUsername: string | null
	authmeRealname: string | null
	firstJoinedAt: string | null
	lastSeenAt: string | null
	isPrimary: boolean
	verifiedAt: string | null
	unlinkedAt: string | null
	createdAt: string
	updatedAt: string
	playerIdentity: {
		playerId: string | null
		boundUuid: string | null
		resolvedUuid: string | null
		observedUuidCount: number
		hasUuidConflict: boolean
		observedPlayers: MinecraftObservedPlayerSummary[]
	}
	luckPermsPrimaryGroup: string | null
	playerProfile: {
		firstPlayedAt: string | null
		lastPlayedAt: string | null
		hasStats: boolean
		hasAdvancements: boolean
		statsCount: number
		advancementsTotalCount: number
		advancementsCompletedCount: number
		distanceTraveledCm: number
		deaths: number
		leaveCount: number
		playTimeTicks: number
	}
	presence: {
		online: boolean
		lastSavedLocation: MinecraftLocationSummary | null
	} | null
	serverViews: MinecraftAccountServerView[]
	defaultViewId: string
	recentHistory: Array<{
		id: string
		action: string
		reason: string | null
		createdAt: string
	}>
	boundPortalUser?: {
		username: string
		avatarUrl: string | null
	} | null
	lastLogin?: MinecraftLastLoginSummary | null
	registration?: MinecraftRegistrationSummary | null
}

export type MinecraftAccountForm = MinecraftAccountSummary

export interface MinecraftAccountsResponse {
	accounts: MinecraftAccountSummary[]
}

export interface BindMinecraftAccountBody {
	username: string
	password: string
	captchaToken?: string
}

export interface UnbindMinecraftAccountBody {
	captchaToken?: string
}

export const formatMinecraftDateTime = (
	value: string | null,
	locale: string,
	notAvailableLabel: string,
): string => {
	if (!value) {
		return notAvailableLabel
	}

	return new Date(value).toLocaleString(locale)
}

export const formatMinecraftLocation = (
	location: MinecraftLocationSummary | null,
	options: {
		locale: string
		notAvailableLabel: string
		unknownCoordsLabel: string
		unknownWorldLabel: string
	},
): string => {
	if (!location) {
		return options.notAvailableLabel
	}

	const coords =
		location.x == null || location.y == null || location.z == null
			? options.unknownCoordsLabel
			: `${location.x.toFixed(1)}, ${location.y.toFixed(1)}, ${location.z.toFixed(1)}`
	const world =
		location.worldName || location.dimension || options.unknownWorldLabel
	const observedAt = location.observedAt
		? ` (${new Date(location.observedAt).toLocaleString(options.locale)})`
		: ''

	return `${world} @ ${coords}${observedAt}`
}

export const describeMinecraftUuidState = (
	account: Pick<MinecraftAccountSummary, 'uuid' | 'playerIdentity'>,
	labels: {
		boundUuid: string
		observedUuid: string
		uuidConflictValue: (count: number) => string
		uuidPending: string
	},
): string => {
	if (account.uuid) {
		return `${labels.boundUuid} · ${account.uuid}`
	}

	if (account.playerIdentity.hasUuidConflict) {
		return labels.uuidConflictValue(account.playerIdentity.observedUuidCount)
	}

	if (account.playerIdentity.resolvedUuid) {
		return `${labels.observedUuid} · ${account.playerIdentity.resolvedUuid}`
	}

	return labels.uuidPending
}

export const getDefaultObservedPlayerUuid = (
	account: Pick<MinecraftAccountSummary, 'uuid' | 'playerIdentity'>,
): string | null =>
	account.uuid ??
	account.playerIdentity.resolvedUuid ??
	account.playerIdentity.observedPlayers[0]?.uuid ??
	null

export const AGGREGATE_SERVER_VIEW_ID = '__aggregate__'

const getServerViewSelectionValue = (
	account: Pick<MinecraftAccountSummary, 'serverViews'>,
	view: MinecraftAccountServerView,
	index: number,
): string => {
	if (view.id === AGGREGATE_SERVER_VIEW_ID) {
		return view.id
	}

	if (view.serverId && view.uuid) {
		return `${view.serverId}:${view.uuid}`
	}

	if (view.serverId) {
		const duplicateIndex = account.serverViews
			.slice(0, index + 1)
			.filter((candidate) => candidate.serverId === view.serverId).length

		return `${view.serverId}#${duplicateIndex}`
	}

	return view.id
}

export const getServerViewSelectionValueForSummary = (
	account: Pick<MinecraftAccountSummary, 'serverViews'>,
	view: MinecraftAccountServerView,
): string => {
	const index = account.serverViews.findIndex((candidate) => candidate === view)

	return getServerViewSelectionValue(account, view, Math.max(index, 0))
}

const findServerViewEntry = (
	account: Pick<MinecraftAccountSummary, 'serverViews' | 'defaultViewId'>,
	selectedViewId: string | null | undefined,
	options?: {
		requireMap?: boolean
	},
): {
	index: number
	view: MinecraftAccountServerView
} | null => {
	const entries = account.serverViews.map((view, index) => ({
		index,
		view,
		value: getServerViewSelectionValue(account, view, index),
	}))

	const selectableEntries = entries.filter(
		(entry) => !options?.requireMap || entry.view.hasMap,
	)

	if (!entries.length || !selectableEntries.length) {
		return null
	}

	if (selectedViewId) {
		return (
			selectableEntries.find((entry) => entry.value === selectedViewId) ??
			selectableEntries.find((entry) => entry.view.id === selectedViewId) ??
			null
		)
	}

	const preferred =
		selectableEntries.find(
			(entry) => entry.view.id === account.defaultViewId,
		) ??
		selectableEntries[0] ??
		null

	return preferred
}

export const getDefaultServerViewId = (
	account: Pick<MinecraftAccountSummary, 'serverViews' | 'defaultViewId'>,
	options?: {
		requireMap?: boolean
	},
): string | null => {
	const entry = findServerViewEntry(account, null, options)
	if (!entry) {
		return null
	}

	return getServerViewSelectionValue(account, entry.view, entry.index)
}

export const resolveServerViewSummary = (
	account: MinecraftAccountSummary,
	selectedViewId: string | null | undefined,
): MinecraftAccountServerView | null => {
	const entry = findServerViewEntry(account, selectedViewId)
	return entry?.view ?? null
}

export const resolveObservedPlayerForServerView = (
	account: MinecraftAccountSummary,
	selectedViewId: string | null | undefined,
): MinecraftObservedPlayerSummary | null => {
	if (!account.playerIdentity.observedPlayers.length) {
		return null
	}

	const serverViewEntry = findServerViewEntry(account, selectedViewId)
	const serverView = serverViewEntry?.view ?? null

	if (!serverView || !serverView.serverId) {
		return resolveObservedPlayerSummary(account, account.uuid)
	}

	const exactMatch = account.playerIdentity.observedPlayers.find(
		(player) =>
			player.serverId === serverView.serverId &&
			(!serverView.uuid || player.uuid === serverView.uuid),
	)
	if (exactMatch) {
		return exactMatch
	}

	const sameServerViews = account.serverViews
		.map((view, index) => ({ view, index }))
		.filter((entry) => entry.view.serverId === serverView.serverId)
	const sameServerViewIndex = sameServerViews.findIndex(
		(entry) => entry.index === serverViewEntry?.index,
	)
	const sameServerObservedPlayers =
		account.playerIdentity.observedPlayers.filter(
			(player) => player.serverId === serverView.serverId,
		)

	return (
		sameServerObservedPlayers[sameServerViewIndex] ??
		sameServerObservedPlayers[0] ??
		null
	)
}

export const resolveObservedPlayerSummary = (
	account: MinecraftAccountSummary,
	selectedUuid: string | null | undefined,
): MinecraftObservedPlayerSummary | null => {
	if (!account.playerIdentity.observedPlayers.length) {
		return null
	}

	if (!selectedUuid) {
		return (
			account.playerIdentity.observedPlayers.find(
				(player) => player.uuid === account.playerIdentity.resolvedUuid,
			) ??
			account.playerIdentity.observedPlayers[0] ??
			null
		)
	}

	return (
		account.playerIdentity.observedPlayers.find(
			(player) => player.uuid === selectedUuid,
		) ??
		account.playerIdentity.observedPlayers[0] ??
		null
	)
}

export const listServerViewItems = (
	account: MinecraftAccountSummary,
	options: {
		locale: string
		aggregateLabel: string
		noUuidLabel: string
		requireMap?: boolean
	},
): Array<{
	label: string
	value: string
}> =>
	account.serverViews
		.filter(
			(view) =>
				!options.requireMap ||
				view.id === AGGREGATE_SERVER_VIEW_ID ||
				view.hasMap,
		)
		.map((view) => {
			const value = getServerViewSelectionValueForSummary(account, view)

			if (view.id === AGGREGATE_SERVER_VIEW_ID) {
				return {
					label: options.aggregateLabel,
					value,
				}
			}

			const observedPlayer = resolveObservedPlayerForServerView(account, value)
			const nameLabel =
				observedPlayer?.username ??
				account.playerIdentity.playerId ??
				account.authmeRealname ??
				account.username
			const uuidLabel =
				view.uuid ??
				observedPlayer?.uuid ??
				account.uuid ??
				account.playerIdentity.resolvedUuid ??
				options.noUuidLabel
			const serverLabel = view.serverNames
				? resolveMinecraftServerLocalizedName(view.serverNames, options.locale)
				: view.label

			return {
				label: `${serverLabel} / ${nameLabel} / ${uuidLabel}`,
				value,
			}
		})
