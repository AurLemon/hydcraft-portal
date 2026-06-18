import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { ensureUserProfileDefaults } from './defaults'
import {
	toEditableProfile,
	toMinecraftSummary,
	toPrivacySummary,
	toPublicProfile,
} from './mapper'
import { findUserProfileById, findUserProfileByUsername } from './repository'
import type {
	EditableUserProfile,
	MinecraftProfileSummary,
	PublicUserProfile,
} from './types'
import { normalizeUsername, normalizeUsernameForComparison } from './validation'

const readMinecraftPresence = async (uuid: string | null | undefined) => {
	if (!uuid) {
		return null
	}

	const player = await prisma.minecraftServerPlayer.findFirst({
		where: {
			uuid,
		},
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
		include: {
			playerData: true,
		},
	})

	if (!player) {
		return null
	}

	return {
		online: player.online,
		lastOnlineAt: player.lastOnlineAt,
		lastOnlineWorldName: player.lastOnlineWorldName,
		lastOnlineDimension: player.lastOnlineDimension,
		lastOnlineX: player.lastOnlineX,
		lastOnlineY: player.lastOnlineY,
		lastOnlineZ: player.lastOnlineZ,
		lastSavedWorldName: player.playerData?.lastWorldName ?? null,
		lastSavedDimension: player.playerData?.lastDimension ?? null,
		lastSavedX: player.playerData?.lastX ?? null,
		lastSavedY: player.playerData?.lastY ?? null,
		lastSavedZ: player.playerData?.lastZ ?? null,
		lastSavedYaw: player.playerData?.lastYaw ?? null,
		lastSavedPitch: player.playerData?.lastPitch ?? null,
		lastSavedObservedAt: player.playerData?.syncedAt ?? null,
	}
}

export const getEditableUserProfile = async (
	userId: string,
): Promise<EditableUserProfile> => {
	await ensureUserProfileDefaults(userId)

	const user = await findUserProfileById(userId)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}
	const presence = await readMinecraftPresence(user.minecraftAccounts[0]?.uuid)

	return toEditableProfile(user, presence)
}

export const getPublicUserProfile = async (
	username: string,
	currentUserId?: string | null,
): Promise<PublicUserProfile> => {
	const user = await findUserProfileByUsername(username)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'PROFILE_NOT_FOUND',
		})
	}

	const privacy = toPrivacySummary(user)

	if (!privacy.publicProfile) {
		throw createApiError({
			statusCode: 404,
			code: 'PROFILE_NOT_PUBLIC',
		})
	}

	const presence = await readMinecraftPresence(user.minecraftAccounts[0]?.uuid)
	return toPublicProfile(user, currentUserId, presence)
}

export const getPublicMinecraftSummary = async (
	username: string,
): Promise<MinecraftProfileSummary> => {
	const user = await findUserProfileByUsername(username)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'PROFILE_NOT_FOUND',
		})
	}

	const privacy = toPrivacySummary(user)

	if (!privacy.publicProfile || !privacy.showMinecraftProfileLink) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_PROFILE_NOT_PUBLIC',
		})
	}

	const summary = toMinecraftSummary(
		user,
		await readMinecraftPresence(user.minecraftAccounts[0]?.uuid),
	)

	if (!summary) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_PROFILE_NOT_FOUND',
		})
	}

	return summary
}

export const checkUsernameAvailability = async (
	usernameInput: unknown,
	currentUserId?: string,
): Promise<{ username: string; available: boolean }> => {
	const username = normalizeUsername(usernameInput)
	const normalizedUsername = normalizeUsernameForComparison(username ?? '')

	if (!username) {
		throw createBadRequestError('USERNAME_REQUIRED')
	}

	const user = await prisma.user.findFirst({
		where: {
			username: {
				equals: normalizedUsername,
				mode: 'insensitive',
			},
		},
		select: {
			id: true,
		},
	})

	return {
		username,
		available: !user || user.id === currentUserId,
	}
}
