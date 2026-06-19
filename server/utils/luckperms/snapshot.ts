import { prisma } from '../db/prisma'
import type { LuckPermsSnapshotBundle } from './primary-group'

export const readLuckPermsSnapshotBundle = async (input: {
	uuids?: string[]
	normalizedUsernames?: string[]
}): Promise<LuckPermsSnapshotBundle> => {
	const uuids = [...new Set((input.uuids ?? []).filter(Boolean))]
	const normalizedUsernames = [
		...new Set((input.normalizedUsernames ?? []).filter(Boolean)),
	]

	if (!uuids.length && !normalizedUsernames.length) {
		return {
			players: [],
			userPermissions: [],
			groupPermissions: [],
		}
	}

	const players = await prisma.luckPermsPlayer.findMany({
		where: {
			OR: [
				...(uuids.length
					? [
							{
								uuid: {
									in: uuids,
								},
							},
						]
					: []),
				...(normalizedUsernames.length
					? [
							{
								normalizedUsername: {
									in: normalizedUsernames,
								},
							},
						]
					: []),
			],
		},
	})

	const matchedUuids = [...new Set(players.map((player) => player.uuid))]

	if (!matchedUuids.length) {
		return {
			players,
			userPermissions: [],
			groupPermissions: [],
		}
	}

	const userPermissions = await prisma.luckPermsUserPermission.findMany({
		where: {
			uuid: {
				in: matchedUuids,
			},
			permission: {
				startsWith: 'group.',
			},
		},
	})
	const groupNames = [
		...new Set(
			userPermissions.map((permission) =>
				permission.permission.slice('group.'.length),
			),
		),
	].filter(Boolean)
	const groupPermissions = groupNames.length
		? await prisma.luckPermsGroupPermission.findMany({
				where: {
					name: {
						in: groupNames,
					},
					permission: {
						startsWith: 'weight.',
					},
				},
			})
		: []

	return {
		players,
		userPermissions,
		groupPermissions,
	}
}
