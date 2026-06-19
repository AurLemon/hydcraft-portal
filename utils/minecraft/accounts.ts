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

export interface MinecraftObservedPlayerSummary {
	uuid: string
	username: string | null
	online: boolean
	lastSeenAt: string | null
	lastPlayedAt: string | null
	playerProfile: {
		firstPlayedAt: string | null
		lastPlayedAt: string | null
		hasStats: boolean
		hasAdvancements: boolean
		statsCount: number
		advancementsTotalCount: number
		advancementsCompletedCount: number
	}
	lastSavedLocation: MinecraftLocationSummary | null
}

export interface MinecraftAccountSummary {
	id: string
	username: string
	normalizedUsername: string
	uuid: string | null
	status: string
	source: string
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
	playerProfile: {
		firstPlayedAt: string | null
		lastPlayedAt: string | null
		hasStats: boolean
		hasAdvancements: boolean
		statsCount: number
		advancementsTotalCount: number
		advancementsCompletedCount: number
	}
	presence: {
		online: boolean
		lastSavedLocation: MinecraftLocationSummary | null
	} | null
	recentHistory: Array<{
		id: string
		action: string
		reason: string | null
		createdAt: string
	}>
}

export interface MinecraftAccountForm extends MinecraftAccountSummary {}

export interface MinecraftAccountsResponse {
	accounts: MinecraftAccountSummary[]
}

export interface BindMinecraftAccountBody {
	username: string
	password: string
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
