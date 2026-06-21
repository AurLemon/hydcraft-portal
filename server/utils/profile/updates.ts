import { setResponseHeader, type H3Event } from 'h3'
import type { User } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { getPublicAttachmentUrl } from '../attachment/runtime'
import { createApiError } from '../errors'
import { emitEvent } from '../events/event-bus'
import { ensureUserProfileDefaults } from './defaults'
import { USERNAME_CHANGE_COOLDOWN_DAYS } from './mapper'
import { getEditableUserProfile, checkUsernameAvailability } from './queries'
import type { EditableUserProfile } from './types'
import {
	normalizeBio,
	normalizeBirthday,
	normalizeBoolean,
	normalizeCountryOrRegion,
	normalizeDisplayName,
	normalizeGender,
	normalizeLanguage,
	normalizeOptionalText,
	normalizeOccupationOrMajor,
	normalizePublicEmail,
	normalizeSchoolOrCompany,
	normalizeTimezone,
	normalizeTimezoneMode,
	normalizeUrl,
	normalizeUsername,
	normalizeUsernameForComparison,
} from './validation'

interface ProfilePatchBody {
	displayName?: unknown
	username?: unknown
	avatarAttachmentId?: unknown
	coverAttachmentId?: unknown
	bio?: unknown
	schoolOrCompany?: unknown
	occupationOrMajor?: unknown
	location?: unknown
	countryOrRegion?: unknown
	gender?: unknown
	birthday?: unknown
	preferences?: Record<string, unknown>
	social?: Record<string, unknown>
	privacy?: Record<string, unknown>
}

const pickDefined = <TData extends Record<string, unknown>>(
	data: TData,
): Partial<TData> =>
	Object.fromEntries(
		Object.entries(data).filter(([, value]) => value !== undefined),
	) as Partial<TData>

const collectChangedField = (
	changedFields: string[],
	fieldName: string,
	value: unknown,
): void => {
	if (value !== undefined) {
		changedFields.push(fieldName)
	}
}

const collectChangedFields = (
	changedFields: string[],
	prefix: string,
	data: Record<string, unknown>,
): void => {
	changedFields.push(...Object.keys(data).map((key) => `${prefix}.${key}`))
}

const normalizePreferenceData = (preferences: Record<string, unknown>) =>
	pickDefined({
		language: normalizeLanguage(preferences.language),
		timezoneMode: normalizeTimezoneMode(preferences.timezoneMode),
		timezone: normalizeTimezone(preferences.timezone),
	})

const normalizeSocialData = (social: Record<string, unknown>) =>
	pickDefined({
		h2wikiPageName: normalizeOptionalText(
			social.h2wikiPageName,
			80,
			'h2wikiPageName',
		),
		githubUsername: normalizeOptionalText(
			social.githubUsername,
			80,
			'githubUsername',
		),
		websiteUrl: normalizeUrl(social.websiteUrl, 'websiteUrl'),
		bilibiliUrl: normalizeUrl(social.bilibiliUrl, 'bilibiliUrl', [
			'bilibili.com',
		]),
		qqNumber: normalizeOptionalText(social.qqNumber, 32, 'qqNumber'),
		wechatId: normalizeOptionalText(social.wechatId, 64, 'wechatId'),
		publicEmail: normalizePublicEmail(social.publicEmail),
	})

const normalizePrivacyData = (privacy: Record<string, unknown>) =>
	pickDefined({
		publicProfile: normalizeBoolean(privacy.publicProfile, 'publicProfile'),
		showHydrolineId: normalizeBoolean(
			privacy.showHydrolineId,
			'showHydrolineId',
		),
		showJoinedAt: normalizeBoolean(privacy.showJoinedAt, 'showJoinedAt'),
		showLocation: normalizeBoolean(privacy.showLocation, 'showLocation'),
		showCountryOrRegion: normalizeBoolean(
			privacy.showCountryOrRegion,
			'showCountryOrRegion',
		),
		showBirthday: normalizeBoolean(privacy.showBirthday, 'showBirthday'),
		showBadges: normalizeBoolean(privacy.showBadges, 'showBadges'),
		showBio: normalizeBoolean(privacy.showBio, 'showBio'),
		showMinecraftProfileLink: normalizeBoolean(
			privacy.showMinecraftProfileLink,
			'showMinecraftProfileLink',
		),
		showSocialLinks: normalizeBoolean(
			privacy.showSocialLinks,
			'showSocialLinks',
		),
		showActivityStatus: normalizeBoolean(
			privacy.showActivityStatus,
			'showActivityStatus',
		),
		searchableInUserDirectory: normalizeBoolean(
			privacy.searchableInUserDirectory,
			'searchableInUserDirectory',
		),
		allowMinecraftProfileDiscovery: normalizeBoolean(
			privacy.allowMinecraftProfileDiscovery,
			'allowMinecraftProfileDiscovery',
		),
	})

const normalizeAttachmentId = (
	value: unknown,
	fieldName: string,
): string | null | undefined => normalizeOptionalText(value, 64, fieldName)

const resolveReadyAttachmentUrl = async (
	attachmentId: string | null | undefined,
	user: User,
	purpose: 'user-avatar' | 'user-cover',
): Promise<string | null | undefined> => {
	if (attachmentId === undefined) {
		return undefined
	}

	if (attachmentId === null) {
		return null
	}

	const attachment = await prisma.attachment.findUnique({
		where: {
			id: attachmentId,
		},
		include: {
			variants: true,
		},
	})

	if (
		!attachment ||
		attachment.createdById !== user.id ||
		attachment.ownerType !== 'user' ||
		attachment.ownerId !== user.id ||
		attachment.purpose !== purpose ||
		attachment.status !== 'READY'
	) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_NOT_FOUND',
		})
	}

	const primaryName = purpose === 'user-avatar' ? 'avatar_256' : 'cover_1440'
	const primaryVariant =
		attachment.variants.find((variant) => variant.name === primaryName) ??
		attachment.variants[0]

	if (!primaryVariant) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_VARIANT_NOT_FOUND',
		})
	}

	return getPublicAttachmentUrl(primaryVariant.objectKey)
}

const getUsernameCooldownUntil = (usernameChangedAt: Date): Date => {
	const date = new Date(usernameChangedAt)
	date.setUTCDate(date.getUTCDate() + USERNAME_CHANGE_COOLDOWN_DAYS)

	return date
}

const assertUsernameCanChange = (user: User): void => {
	if (!user.usernameChangedAt) {
		return
	}

	const canChangeAt = getUsernameCooldownUntil(user.usernameChangedAt)

	if (canChangeAt.getTime() <= Date.now()) {
		return
	}

	throw createApiError({
		statusCode: 429,
		code: 'USERNAME_CHANGE_COOLDOWN',
		data: {
			canChangeUsernameAt: canChangeAt.toISOString(),
			usernameChangeCooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
		},
	})
}

const isUsernameCaseOnlyChange = (
	currentUsername: string,
	nextUsername: string,
): boolean =>
	currentUsername !== nextUsername &&
	normalizeUsernameForComparison(currentUsername) ===
		normalizeUsernameForComparison(nextUsername)

const emitProfileUpdateEvents = async (
	user: User,
	username: string | undefined,
	changedFields: string[],
	updatedAt: Date,
): Promise<void> => {
	if (username && username !== user.username) {
		await emitEvent('user.profile.username-changed', {
			userId: user.id,
			previousUsername: user.username,
			nextUsername: username,
			updatedAt,
		})
	}

	const privacyChangedFields = changedFields.filter((field) =>
		field.startsWith('privacy.'),
	)

	if (privacyChangedFields.length) {
		await emitEvent('user.profile.privacy-updated', {
			userId: user.id,
			changedFields: privacyChangedFields,
			updatedAt,
		})
	}

	if (changedFields.length) {
		await emitEvent('user.profile.updated', {
			userId: user.id,
			changedFields,
			updatedAt,
		})
	}
}

export const updateEditableUserProfile = async (
	event: H3Event,
	user: User,
	body: ProfilePatchBody,
): Promise<EditableUserProfile> => {
	await ensureUserProfileDefaults(user.id)

	const username = normalizeUsername(body.username)
	const usernameCaseOnlyChange =
		username === undefined
			? false
			: isUsernameCaseOnlyChange(user.username, username)
	const usernameChanged = username !== undefined && username !== user.username
	const usernameChangedBeyondCase = usernameChanged && !usernameCaseOnlyChange
	const avatarAttachmentId = normalizeAttachmentId(
		body.avatarAttachmentId,
		'avatarAttachmentId',
	)
	const coverAttachmentId = normalizeAttachmentId(
		body.coverAttachmentId,
		'coverAttachmentId',
	)
	const displayName = normalizeDisplayName(body.displayName)
	const bio = normalizeBio(body.bio)
	const schoolOrCompany = normalizeSchoolOrCompany(body.schoolOrCompany)
	const occupationOrMajor = normalizeOccupationOrMajor(body.occupationOrMajor)
	const location = normalizeOptionalText(body.location, 80, 'location')
	const countryOrRegion = normalizeCountryOrRegion(body.countryOrRegion)
	const gender = normalizeGender(body.gender)
	const birthday = normalizeBirthday(body.birthday)

	if (usernameChangedBeyondCase) {
		assertUsernameCanChange(user)

		const availability = await checkUsernameAvailability(username, user.id)

		if (!availability.available) {
			throw createApiError({
				statusCode: 409,
				code: 'USERNAME_TAKEN',
			})
		}
	}

	const avatarUrl = await resolveReadyAttachmentUrl(
		avatarAttachmentId,
		user,
		'user-avatar',
	)
	const coverUrl = await resolveReadyAttachmentUrl(
		coverAttachmentId,
		user,
		'user-cover',
	)

	const changedFields: string[] = []
	collectChangedField(changedFields, 'username', username)
	collectChangedField(changedFields, 'avatarAttachmentId', avatarAttachmentId)
	collectChangedField(changedFields, 'coverAttachmentId', coverAttachmentId)
	collectChangedField(changedFields, 'displayName', displayName)
	collectChangedField(changedFields, 'bio', bio)
	collectChangedField(changedFields, 'schoolOrCompany', schoolOrCompany)
	collectChangedField(changedFields, 'occupationOrMajor', occupationOrMajor)
	collectChangedField(changedFields, 'location', location)
	collectChangedField(changedFields, 'countryOrRegion', countryOrRegion)
	collectChangedField(changedFields, 'gender', gender)
	collectChangedField(changedFields, 'birthday', birthday)

	const userData = {
		...(username !== undefined ? { username } : {}),
		...(usernameChangedBeyondCase ? { usernameChangedAt: new Date() } : {}),
		// TODO: Keep avatarUrl/coverUrl only for legacy compatibility.
		// Future UI should resolve display URLs from Attachment variants instead of storing full URLs on User.
		...(avatarAttachmentId !== undefined
			? { avatarAttachmentId, avatarUrl }
			: {}),
		...(coverAttachmentId !== undefined ? { coverAttachmentId, coverUrl } : {}),
		...(displayName !== undefined ? { displayName } : {}),
		...(bio !== undefined ? { bio } : {}),
		...(schoolOrCompany !== undefined ? { schoolOrCompany } : {}),
		...(occupationOrMajor !== undefined ? { occupationOrMajor } : {}),
		...(location !== undefined ? { location } : {}),
		...(countryOrRegion !== undefined ? { countryOrRegion } : {}),
		...(gender !== undefined ? { gender } : {}),
		...(birthday !== undefined ? { birthday } : {}),
	}
	const preferences = body.preferences ?? {}
	const social = body.social ?? {}
	const privacy = body.privacy ?? {}
	const preferenceData = normalizePreferenceData(preferences)
	const socialData = normalizeSocialData(social)
	const privacyData = normalizePrivacyData(privacy)

	await prisma.$transaction(async (tx) => {
		if (Object.keys(userData).length) {
			await tx.user.update({
				where: {
					id: user.id,
				},
				data: userData,
			})
		}

		if (Object.keys(preferenceData).length) {
			collectChangedFields(changedFields, 'preferences', preferenceData)
			await tx.userProfilePreferences.update({
				where: {
					userId: user.id,
				},
				data: preferenceData,
			})
		}

		if (Object.keys(socialData).length) {
			collectChangedFields(changedFields, 'social', socialData)
			await tx.userProfile.update({
				where: {
					userId: user.id,
				},
				data: socialData,
			})
		}

		if (Object.keys(privacyData).length) {
			collectChangedFields(changedFields, 'privacy', privacyData)
			await tx.userProfilePrivacy.update({
				where: {
					userId: user.id,
				},
				data: privacyData,
			})
		}
	})

	const updatedAt = new Date()
	await emitProfileUpdateEvents(user, username, changedFields, updatedAt)

	if (avatarAttachmentId !== undefined) {
		await emitEvent('user.profile.attachment-replaced', {
			userId: user.id,
			purpose: 'user-avatar',
			activeAttachmentId: avatarAttachmentId,
			updatedAt,
		})
	}

	if (coverAttachmentId !== undefined) {
		await emitEvent('user.profile.attachment-replaced', {
			userId: user.id,
			purpose: 'user-cover',
			activeAttachmentId: coverAttachmentId,
			updatedAt,
		})
	}

	setResponseHeader(event, 'x-profile-changed-fields', changedFields.join(','))

	return await getEditableUserProfile(user.id)
}
