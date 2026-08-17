import {
	homeImmersiveOverview,
	homeImmersiveScenes,
} from '~/utils/home/immersive-scenes'
import type {
	HomePlayerLocationItem,
	HomePlayerLocationsResponse,
} from '~/utils/home/player-locations'
import { normalizeUsernameForComparison } from '~/server/utils/profile/validation'
import { prisma } from '../db/prisma'
import { resolvePresenceLocation } from './account-summary'

interface HomePlayerLocationTarget {
	playerId: string
	serverId: string
}

const targetKey = (serverId: string, normalizedUsername: string): string =>
	`${serverId}\u0000${normalizedUsername}`

const uniqueTargets = (
	targets: readonly HomePlayerLocationTarget[],
): HomePlayerLocationTarget[] => {
	const unique = new Map<string, HomePlayerLocationTarget>()

	for (const target of targets) {
		const normalizedUsername = normalizeUsernameForComparison(target.playerId)
		if (!normalizedUsername) continue
		unique.set(targetKey(target.serverId, normalizedUsername), target)
	}

	return [...unique.values()]
}

const resolveHomePosition = (
	playerData: {
		lastWorldName: string | null
		lastDimension: string | null
		lastX: number | null
		lastY: number | null
		lastZ: number | null
	} | null,
): HomePlayerLocationItem['position'] => {
	const location = resolvePresenceLocation({
		worldName: playerData?.lastWorldName ?? null,
		dimension: playerData?.lastDimension ?? null,
		x: playerData?.lastX ?? null,
		y: playerData?.lastY ?? null,
		z: playerData?.lastZ ?? null,
		yaw: null,
		pitch: null,
		observedAt: null,
	})
	if (
		!location ||
		!Number.isFinite(location.x) ||
		!Number.isFinite(location.y) ||
		!Number.isFinite(location.z)
	) {
		return null
	}

	const dimension =
		`${location.dimension ?? ''} ${location.worldName ?? ''}`.toLowerCase()
	if (dimension.includes('nether') || dimension.includes('the_end')) return null

	return {
		x: location.x!,
		y: location.y!,
		z: location.z!,
	}
}

export const getHomePlayerLocations = async (input: {
	sceneId: string
	includeOverview: boolean
}): Promise<HomePlayerLocationsResponse | null> => {
	const scene = homeImmersiveScenes.find((item) => item.id === input.sceneId)
	if (!scene) return null

	const sceneTargets = uniqueTargets(
		scene.players.map(({ id: playerId, serverId }) => ({ playerId, serverId })),
	)
	const overviewTargets = input.includeOverview
		? uniqueTargets(
				homeImmersiveOverview.members.map(({ id: playerId, serverId }) => ({
					playerId,
					serverId,
				})),
			)
		: []
	const allTargets = uniqueTargets([...sceneTargets, ...overviewTargets])
	const queryTargets = allTargets.flatMap((target) => {
		const normalizedUsername = normalizeUsernameForComparison(target.playerId)
		return normalizedUsername
			? [{ serverId: target.serverId, normalizedUsername }]
			: []
	})
	const players = queryTargets.length
		? await prisma.minecraftServerPlayer.findMany({
				where: { OR: queryTargets },
				select: {
					serverId: true,
					normalizedUsername: true,
					playerData: {
						select: {
							lastWorldName: true,
							lastDimension: true,
							lastX: true,
							lastY: true,
							lastZ: true,
						},
					},
				},
				orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
			})
		: []
	const playerByTarget = new Map<string, (typeof players)[number]>()

	for (const player of players) {
		if (!player.normalizedUsername) continue
		const key = targetKey(player.serverId, player.normalizedUsername)
		if (!playerByTarget.has(key)) playerByTarget.set(key, player)
	}

	const mapTargets = (
		targets: readonly HomePlayerLocationTarget[],
	): HomePlayerLocationItem[] =>
		targets.map((target) => {
			const normalizedUsername = normalizeUsernameForComparison(target.playerId)
			const player = normalizedUsername
				? playerByTarget.get(targetKey(target.serverId, normalizedUsername))
				: undefined

			return {
				playerId: target.playerId,
				serverId: target.serverId,
				position: resolveHomePosition(player?.playerData ?? null),
			}
		})

	return {
		scene: mapTargets(sceneTargets),
		...(input.includeOverview ? { overview: mapTargets(overviewTargets) } : {}),
	}
}
