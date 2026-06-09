import { createError } from 'h3'
import { prisma } from '../db/prisma'
import type { UserProfilePrivacySummary } from './types'

export const defaultProfilePrivacy: UserProfilePrivacySummary = {
	publicProfile: true,
	showHydrolineId: true,
	showJoinedAt: true,
	showLocation: true,
	showCountryOrRegion: true,
	showBirthday: false,
	showBadges: true,
	showBio: true,
	showMinecraftProfileLink: true,
	showSocialLinks: true,
	showActivityStatus: true,
	searchableInUserDirectory: true,
	allowMinecraftProfileDiscovery: true,
}

const createHydrolineId = (): string => {
	const now = new Date()
	const year = now.getUTCFullYear()
	const suffix = Math.floor(100000 + Math.random() * 900000)

	return `H-${year}${suffix}`
}

export const createUniqueHydrolineId = async (): Promise<string> => {
	for (let attempt = 0; attempt < 8; attempt += 1) {
		const hydrolineId = createHydrolineId()
		const exists = await prisma.user.findUnique({
			where: {
				hydrolineId,
			},
			select: {
				id: true,
			},
		})

		if (!exists) {
			return hydrolineId
		}
	}

	throw createError({
		statusCode: 500,
		statusMessage: 'Unable to create Hydroline ID',
	})
}

export const ensureUserProfileDefaults = async (
	userId: string,
): Promise<void> => {
	await prisma.userProfile.upsert({
		where: {
			userId,
		},
		create: {
			userId,
		},
		update: {},
	})
	await prisma.userProfilePreferences.upsert({
		where: {
			userId,
		},
		create: {
			userId,
			language: 'ZH_CN',
			timezoneMode: 'AUTO',
			timezone: 'Asia/Shanghai',
		},
		update: {},
	})
	await prisma.userProfilePrivacy.upsert({
		where: {
			userId,
		},
		create: {
			userId,
			...defaultProfilePrivacy,
		},
		update: {},
	})
}
