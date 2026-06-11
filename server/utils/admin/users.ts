import { useRuntimeConfig } from '#imports'
import { randomInt } from 'node:crypto'
import type {
	Prisma,
	User,
	UserRole,
	UserStatus,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { emitEvent } from '../events/event-bus'
import { ensureUserProfileDefaults } from '../profile/defaults'
import {
	normalizeBio,
	normalizeBirthday,
	normalizeBoolean,
	normalizeCountryOrRegion,
	normalizeDisplayName,
	normalizeLanguage,
	normalizeOptionalText,
	normalizePublicEmail,
	normalizeTimezone,
	normalizeTimezoneMode,
	normalizeUrl,
	normalizeUsername,
} from '../profile/validation'

const USER_ROLES = new Set<UserRole>(['USER', 'MEMBER', 'ADMIN', 'OWNER'])
const USER_STATUSES = new Set<UserStatus>([
	'PENDING',
	'ACTIVE',
	'DISABLED',
	'BANNED',
])
const USER_SORT_FIELDS = new Set([
	'createdAt',
	'updatedAt',
	'username',
	'displayName',
	'hydrolineId',
	'role',
	'status',
])
const HYDROLINE_RANDOM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const pickDefined = <TData extends Record<string, unknown>>(
	data: TData,
): Partial<TData> =>
	Object.fromEntries(
		Object.entries(data).filter(([, value]) => value !== undefined),
	) as Partial<TData>

const badRequest = (code: string) => createBadRequestError(code)

const ownerRoleError = () =>
	createApiError({
		statusCode: 403,
		code: 'OWNER_ROLE_REQUIRES_OWNER',
	})

const normalizeRole = (value: unknown): UserRole | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !USER_ROLES.has(value as UserRole)) {
		throw badRequest('ROLE_INVALID')
	}

	return value as UserRole
}

const normalizeStatus = (value: unknown): UserStatus | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !USER_STATUSES.has(value as UserStatus)) {
		throw badRequest('STATUS_INVALID')
	}

	return value as UserStatus
}

const normalizeJoinedAt = (value: unknown): Date | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw badRequest('JOINED_AT_INVALID')
	}

	const joinedAt = new Date(`${value}T00:00:00.000Z`)

	if (
		Number.isNaN(joinedAt.getTime()) ||
		joinedAt.toISOString().slice(0, 10) !== value
	) {
		throw badRequest('JOINED_AT_INVALID')
	}

	return joinedAt
}

const normalizeAttachmentId = (
	value: unknown,
	fieldName: string,
): string | null | undefined => normalizeOptionalText(value, 64, fieldName)

const normalizeRegenerateHydrolineId = (value: unknown): boolean => {
	if (value === undefined) {
		return false
	}

	return normalizeBoolean(value, 'regenerateHydrolineId') ?? false
}

const formatHydrolineDatePart = (date: Date): string => {
	const year = date.getUTCFullYear().toString().slice(-2)
	const month = String(date.getUTCMonth() + 1).padStart(2, '0')
	const day = String(date.getUTCDate()).padStart(2, '0')

	return `${year}${month}${day}`
}

const generateHydrolineRandomPart = (): string =>
	Array.from(
		{ length: 6 },
		() =>
			HYDROLINE_RANDOM_ALPHABET[randomInt(HYDROLINE_RANDOM_ALPHABET.length)] ??
			'0',
	).join('')

const generateUniqueHydrolineId = async (
	userId: string,
	joinedAt: Date,
): Promise<string> => {
	const datePart = formatHydrolineDatePart(joinedAt)

	for (let attempt = 0; attempt < 20; attempt += 1) {
		const hydrolineId = `H-${datePart}${generateHydrolineRandomPart()}`
		const exists = await prisma.user.findFirst({
			where: {
				hydrolineId,
				id: {
					not: userId,
				},
			},
			select: {
				id: true,
			},
		})

		if (!exists) {
			return hydrolineId
		}
	}

	throw createApiError({
		statusCode: 500,
		code: 'HYDROLINE_ID_GENERATION_FAILED',
	})
}

const resolveReadyAttachmentUrl = async (
	attachmentId: string | null | undefined,
	userId: string,
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
		attachment.ownerType !== 'user' ||
		attachment.ownerId !== userId ||
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

	const config = useRuntimeConfig()
	const publicBaseUrl = String(config.cos.publicBaseUrl).replace(/\/$/, '')

	if (!publicBaseUrl) {
		throw createApiError({
			statusCode: 500,
			code: 'COS_PUBLIC_BASE_URL_MISSING',
		})
	}

	return `${publicBaseUrl}/${primaryVariant.objectKey}`
}

const normalizeBadgeIds = (value: unknown): string[] | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw badRequest('BADGE_IDS_INVALID')
	}

	return [...new Set(value.map((item) => item.trim()).filter(Boolean))]
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

export const adminUserInclude = {
	profile: true,
	preferences: true,
	privacy: true,
	badges: {
		orderBy: {
			sortOrder: 'asc',
		},
		include: {
			badge: true,
		},
	},
	minecraftAccounts: {
		where: {
			unlinkedAt: null,
		},
		orderBy: [
			{
				isPrimary: 'desc',
			},
			{
				updatedAt: 'desc',
			},
		],
		take: 5,
	},
	createdAttachments: {
		orderBy: {
			createdAt: 'desc',
		},
		take: 8,
		include: {
			variants: true,
		},
	},
} satisfies Prisma.UserInclude

type AdminUserEntity = Prisma.UserGetPayload<{
	include: typeof adminUserInclude
}>

export const serializeAdminUser = (user: AdminUserEntity) => ({
	id: user.id,
	handle: user.handle,
	username: user.username,
	usernameChangedAt: user.usernameChangedAt,
	hydrolineId: user.hydrolineId,
	displayName: user.displayName,
	email: user.email,
	emailVerifiedAt: user.emailVerifiedAt,
	avatarUrl: user.avatarUrl,
	coverUrl: user.coverUrl,
	avatarAttachmentId: user.avatarAttachmentId,
	coverAttachmentId: user.coverAttachmentId,
	bio: user.bio,
	location: user.location,
	countryOrRegion: user.countryOrRegion,
	birthday: user.birthday,
	role: user.role,
	status: user.status,
	statusReason: user.statusReason,
	verified: user.verified,
	verifiedTextZhCn: user.verifiedTextZhCn,
	verifiedTextZhTw: user.verifiedTextZhTw,
	verifiedTextEnUs: user.verifiedTextEnUs,
	verifiedTextJaJp: user.verifiedTextJaJp,
	lastLoginAt: user.lastLoginAt,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
	profile: user.profile,
	preferences: user.preferences,
	privacy: user.privacy,
	badges: user.badges,
	minecraftAccounts: user.minecraftAccounts,
	attachments: user.createdAttachments.map((attachment) => ({
		id: attachment.id,
		category: attachment.category,
		purpose: attachment.purpose,
		status: attachment.status,
		objectKey: attachment.objectKey,
		createdAt: attachment.createdAt,
		variantCount: attachment.variants.length,
	})),
})

export const listAdminUsers = async (input: {
	page: number
	pageSize: number
	search?: string
	role?: string
	status?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const where: Prisma.UserWhereInput = {
		...(input.role ? { role: input.role as UserRole } : {}),
		...(input.status ? { status: input.status as UserStatus } : {}),
		...(input.search
			? {
					OR: [
						{ username: { contains: input.search, mode: 'insensitive' } },
						{ handle: { contains: input.search, mode: 'insensitive' } },
						{ hydrolineId: { contains: input.search, mode: 'insensitive' } },
						{ email: { contains: input.search, mode: 'insensitive' } },
						{ displayName: { contains: input.search, mode: 'insensitive' } },
					],
				}
			: {}),
	}
	const sortField = input.sortField ?? 'createdAt'
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.UserOrderByWithRelationInput = USER_SORT_FIELDS.has(
		sortField,
	)
		? { [sortField]: sortDirection }
		: { createdAt: 'desc' }

	const [total, users] = await Promise.all([
		prisma.user.count({ where }),
		prisma.user.findMany({
			where,
			orderBy,
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			include: adminUserInclude,
		}),
	])

	return {
		items: users.map(serializeAdminUser),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(Math.ceil(total / input.pageSize), 1),
	}
}

export const getAdminUser = async (userId: string) => {
	await ensureUserProfileDefaults(userId)
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		include: adminUserInclude,
	})

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	return serializeAdminUser(user)
}

interface AdminUserUpdateBody {
	username?: unknown
	displayName?: unknown
	createdAt?: unknown
	bio?: unknown
	location?: unknown
	countryOrRegion?: unknown
	birthday?: unknown
	role?: unknown
	status?: unknown
	statusReason?: unknown
	verified?: unknown
	verifiedTextZhCn?: unknown
	verifiedTextZhTw?: unknown
	verifiedTextEnUs?: unknown
	verifiedTextJaJp?: unknown
	resetAvatar?: unknown
	resetCover?: unknown
	avatarAttachmentId?: unknown
	coverAttachmentId?: unknown
	regenerateHydrolineId?: unknown
	badgeIds?: unknown
	preferences?: Record<string, unknown>
	social?: Record<string, unknown>
	privacy?: Record<string, unknown>
}

export const updateAdminUser = async (
	actingUser: User,
	userId: string,
	body: AdminUserUpdateBody,
) => {
	const targetUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
			role: true,
			createdAt: true,
		},
	})

	if (!targetUser) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	await ensureUserProfileDefaults(userId)
	const username = normalizeUsername(body.username)
	const displayName = normalizeDisplayName(body.displayName)
	const createdAt = normalizeJoinedAt(body.createdAt)
	const bio = normalizeBio(body.bio)
	const location = normalizeOptionalText(body.location, 80, 'location')
	const countryOrRegion = normalizeCountryOrRegion(body.countryOrRegion)
	const birthday = normalizeBirthday(body.birthday)
	const role = normalizeRole(body.role)
	const status = normalizeStatus(body.status)
	const statusReason = normalizeOptionalText(
		body.statusReason,
		200,
		'statusReason',
	)
	const verified = normalizeBoolean(body.verified, 'verified')
	const verifiedTextZhCn = normalizeOptionalText(
		body.verifiedTextZhCn,
		120,
		'verifiedTextZhCn',
	)
	const verifiedTextZhTw = normalizeOptionalText(
		body.verifiedTextZhTw,
		120,
		'verifiedTextZhTw',
	)
	const verifiedTextEnUs = normalizeOptionalText(
		body.verifiedTextEnUs,
		120,
		'verifiedTextEnUs',
	)
	const verifiedTextJaJp = normalizeOptionalText(
		body.verifiedTextJaJp,
		120,
		'verifiedTextJaJp',
	)
	const resetAvatar = normalizeBoolean(body.resetAvatar, 'resetAvatar')
	const resetCover = normalizeBoolean(body.resetCover, 'resetCover')
	const avatarAttachmentId = normalizeAttachmentId(
		body.avatarAttachmentId,
		'avatarAttachmentId',
	)
	const coverAttachmentId = normalizeAttachmentId(
		body.coverAttachmentId,
		'coverAttachmentId',
	)
	const regenerateHydrolineId = normalizeRegenerateHydrolineId(
		body.regenerateHydrolineId,
	)
	const badgeIds = normalizeBadgeIds(body.badgeIds)
	const preferences = body.preferences ?? {}
	const social = body.social ?? {}
	const privacy = body.privacy ?? {}
	const preferenceData = normalizePreferenceData(preferences)
	const socialData = normalizeSocialData(social)
	const privacyData = normalizePrivacyData(privacy)

	if (
		role !== undefined &&
		(role === 'OWNER' || targetUser.role === 'OWNER') &&
		actingUser.role !== 'OWNER'
	) {
		throw ownerRoleError()
	}

	const generatedHydrolineId = regenerateHydrolineId
		? await generateUniqueHydrolineId(userId, createdAt ?? targetUser.createdAt)
		: undefined
	const avatarUrl = resetAvatar
		? null
		: await resolveReadyAttachmentUrl(avatarAttachmentId, userId, 'user-avatar')
	const coverUrl = resetCover
		? null
		: await resolveReadyAttachmentUrl(coverAttachmentId, userId, 'user-cover')

	const userData = {
		...(username !== undefined ? { username } : {}),
		...(generatedHydrolineId !== undefined
			? { hydrolineId: generatedHydrolineId }
			: {}),
		...(displayName !== undefined ? { displayName } : {}),
		...(createdAt !== undefined ? { createdAt } : {}),
		...(bio !== undefined ? { bio } : {}),
		...(location !== undefined ? { location } : {}),
		...(countryOrRegion !== undefined ? { countryOrRegion } : {}),
		...(birthday !== undefined ? { birthday } : {}),
		...(role !== undefined ? { role } : {}),
		...(status !== undefined ? { status } : {}),
		...(statusReason !== undefined ? { statusReason } : {}),
		...(verified !== undefined ? { verified } : {}),
		...(verifiedTextZhCn !== undefined ? { verifiedTextZhCn } : {}),
		...(verifiedTextZhTw !== undefined ? { verifiedTextZhTw } : {}),
		...(verifiedTextEnUs !== undefined ? { verifiedTextEnUs } : {}),
		...(verifiedTextJaJp !== undefined ? { verifiedTextJaJp } : {}),
		...(resetAvatar ? { avatarUrl: null, avatarAttachmentId: null } : {}),
		...(resetCover ? { coverUrl: null, coverAttachmentId: null } : {}),
		...(avatarAttachmentId !== undefined
			? { avatarAttachmentId, avatarUrl }
			: {}),
		...(coverAttachmentId !== undefined ? { coverAttachmentId, coverUrl } : {}),
	}

	if (username) {
		const exists = await prisma.user.findFirst({
			where: {
				username,
				id: {
					not: userId,
				},
			},
			select: {
				id: true,
			},
		})

		if (exists) {
			throw createApiError({
				statusCode: 409,
				code: 'USERNAME_TAKEN',
			})
		}
	}

	await prisma.$transaction(async (tx) => {
		if (Object.keys(userData).length) {
			await tx.user.update({
				where: {
					id: userId,
				},
				data: userData,
			})
		}

		if (Object.keys(preferenceData).length) {
			await tx.userProfilePreferences.update({
				where: {
					userId,
				},
				data: preferenceData,
			})
		}

		if (Object.keys(socialData).length) {
			await tx.userProfile.update({
				where: {
					userId,
				},
				data: socialData,
			})
		}

		if (Object.keys(privacyData).length) {
			await tx.userProfilePrivacy.update({
				where: {
					userId,
				},
				data: privacyData,
			})
		}

		if (badgeIds) {
			await tx.userProfileBadge.deleteMany({
				where: {
					userId,
				},
			})

			if (badgeIds.length) {
				await tx.userProfileBadge.createMany({
					data: badgeIds.map((badgeId, index) => ({
						userId,
						badgeId,
						sortOrder: index,
					})),
				})
			}
		}
	})

	const updatedAt = new Date()

	if (avatarAttachmentId !== undefined || resetAvatar) {
		await emitEvent('user.profile.attachment-replaced', {
			userId,
			purpose: 'user-avatar',
			activeAttachmentId: resetAvatar ? null : (avatarAttachmentId ?? null),
			updatedAt,
		})
	}

	if (coverAttachmentId !== undefined || resetCover) {
		await emitEvent('user.profile.attachment-replaced', {
			userId,
			purpose: 'user-cover',
			activeAttachmentId: resetCover ? null : (coverAttachmentId ?? null),
			updatedAt,
		})
	}

	return await getAdminUser(userId)
}
