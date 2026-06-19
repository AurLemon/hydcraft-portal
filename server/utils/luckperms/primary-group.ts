import type { Prisma } from '~/generated/prisma/client'

type LuckPermsPlayerEntity = Prisma.LuckPermsPlayerGetPayload<
	Record<string, never>
>
type LuckPermsUserPermissionEntity = Prisma.LuckPermsUserPermissionGetPayload<
	Record<string, never>
>
type LuckPermsGroupPermissionEntity = Prisma.LuckPermsGroupPermissionGetPayload<
	Record<string, never>
>

export interface LuckPermsSnapshotBundle {
	players: LuckPermsPlayerEntity[]
	userPermissions: LuckPermsUserPermissionEntity[]
	groupPermissions: LuckPermsGroupPermissionEntity[]
}

interface LuckPermsIdentityInput {
	uuid?: string | null
	normalizedUsername?: string | null
}

const GROUP_PERMISSION_PREFIX = 'group.'
const WEIGHT_PERMISSION_PREFIX = 'weight.'

const isLuckPermsPermissionEnabled = (value: boolean): boolean => value

const isLuckPermsPermissionActive = (
	expiry: bigint,
	nowUnixSeconds: bigint,
): boolean => expiry <= BigInt(0) || expiry > nowUnixSeconds

const extractGroupName = (permission: string): string | null =>
	permission.startsWith(GROUP_PERMISSION_PREFIX)
		? permission.slice(GROUP_PERMISSION_PREFIX.length) || null
		: null

const extractWeight = (permission: string): number | null => {
	if (!permission.startsWith(WEIGHT_PERMISSION_PREFIX)) {
		return null
	}

	const value = Number(permission.slice(WEIGHT_PERMISSION_PREFIX.length))

	return Number.isFinite(value) ? value : null
}

export const createLuckPermsPrimaryGroupResolver = (
	bundle: LuckPermsSnapshotBundle,
) => {
	const nowUnixSeconds = BigInt(Math.floor(Date.now() / 1000))
	const playersByUuid = new Map(
		bundle.players.map((player) => [player.uuid, player]),
	)
	const playersByNormalizedUsername = new Map(
		bundle.players.flatMap((player) =>
			player.normalizedUsername
				? [[player.normalizedUsername, player] as const]
				: [],
		),
	)
	const userPermissionsByUuid = new Map<
		string,
		LuckPermsUserPermissionEntity[]
	>()
	const groupPermissionsByName = new Map<
		string,
		LuckPermsGroupPermissionEntity[]
	>()

	for (const permission of bundle.userPermissions) {
		const bucket = userPermissionsByUuid.get(permission.uuid) ?? []
		bucket.push(permission)
		userPermissionsByUuid.set(permission.uuid, bucket)
	}

	for (const permission of bundle.groupPermissions) {
		const bucket = groupPermissionsByName.get(permission.name) ?? []
		bucket.push(permission)
		groupPermissionsByName.set(permission.name, bucket)
	}

	const resolvePlayer = (
		input: LuckPermsIdentityInput,
	): LuckPermsPlayerEntity | null => {
		if (input.uuid && playersByUuid.has(input.uuid)) {
			return playersByUuid.get(input.uuid) ?? null
		}

		if (
			input.normalizedUsername &&
			playersByNormalizedUsername.has(input.normalizedUsername)
		) {
			return playersByNormalizedUsername.get(input.normalizedUsername) ?? null
		}

		return null
	}

	const resolveEffectivePrimaryGroup = (
		input: LuckPermsIdentityInput,
	): string | null => {
		const player = resolvePlayer(input)

		if (!player) {
			return null
		}

		const inheritedGroups = [
			...new Set(
				(userPermissionsByUuid.get(player.uuid) ?? [])
					.filter(
						(permission) =>
							isLuckPermsPermissionEnabled(permission.value) &&
							isLuckPermsPermissionActive(permission.expiry, nowUnixSeconds),
					)
					.flatMap(
						(permission) => extractGroupName(permission.permission) ?? [],
					),
			),
		]

		if (!inheritedGroups.length) {
			return player.primaryGroup
		}

		const nonDefaultGroups = inheritedGroups.filter(
			(groupName) => groupName !== 'default',
		)
		let bestGroup: string | null = null
		let bestWeight = Number.NEGATIVE_INFINITY

		for (const groupName of inheritedGroups) {
			const weights = (groupPermissionsByName.get(groupName) ?? [])
				.filter(
					(permission) =>
						isLuckPermsPermissionEnabled(permission.value) &&
						isLuckPermsPermissionActive(permission.expiry, nowUnixSeconds),
				)
				.flatMap((permission) => extractWeight(permission.permission) ?? [])

			for (const weight of weights) {
				if (
					bestGroup === null ||
					weight > bestWeight ||
					(weight === bestWeight && groupName.localeCompare(bestGroup) < 0)
				) {
					bestGroup = groupName
					bestWeight = weight
				}
			}
		}

		if (bestGroup) {
			return bestGroup
		}

		if (player.primaryGroup && inheritedGroups.includes(player.primaryGroup)) {
			return player.primaryGroup
		}

		if (nonDefaultGroups.length === 1) {
			return nonDefaultGroups[0] ?? null
		}

		if (inheritedGroups.length === 1) {
			return inheritedGroups[0] ?? null
		}

		return player.primaryGroup
	}

	return {
		resolvePlayer,
		resolveEffectivePrimaryGroup,
	}
}
