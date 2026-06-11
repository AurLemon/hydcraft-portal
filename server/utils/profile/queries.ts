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
import { normalizeUsername } from './validation'

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

	return toEditableProfile(user)
}

export const getPublicUserProfile = async (
	username: string,
	currentUserId?: string | null,
): Promise<PublicUserProfile> => {
	const user = await findUserProfileByUsername(username.toLowerCase())

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

	return toPublicProfile(user, currentUserId)
}

export const getPublicMinecraftSummary = async (
	username: string,
): Promise<MinecraftProfileSummary> => {
	const user = await findUserProfileByUsername(username.toLowerCase())

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

	const summary = toMinecraftSummary(user)

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

	if (!username) {
		throw createBadRequestError('USERNAME_REQUIRED')
	}

	const user = await prisma.user.findUnique({
		where: {
			username,
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
