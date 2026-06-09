import { createError } from 'h3'
import { prisma } from '../db/prisma'
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
		throw createError({
			statusCode: 404,
			statusMessage: 'User not found',
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
		throw createError({
			statusCode: 404,
			statusMessage: 'Profile not found',
		})
	}

	const privacy = toPrivacySummary(user)

	if (!privacy.publicProfile) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Profile not public',
		})
	}

	return toPublicProfile(user, currentUserId)
}

export const getPublicMinecraftSummary = async (
	username: string,
): Promise<MinecraftProfileSummary> => {
	const user = await findUserProfileByUsername(username.toLowerCase())

	if (!user) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Profile not found',
		})
	}

	const privacy = toPrivacySummary(user)

	if (!privacy.publicProfile || !privacy.showMinecraftProfileLink) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Minecraft profile not public',
		})
	}

	const summary = toMinecraftSummary(user)

	if (!summary) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Minecraft profile not found',
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
		throw createError({
			statusCode: 400,
			statusMessage: 'username is required',
		})
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
