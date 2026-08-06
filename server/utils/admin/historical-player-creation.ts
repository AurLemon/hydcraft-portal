import { createHash } from 'node:crypto'
import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { normalizeMinecraftUsername } from '../minecraft/normalize'

const MINECRAFT_USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/

export interface OfflineMinecraftIdentity {
	username: string
	normalizedUsername: string
	uuid: string
}

export interface CreateHistoricalMinecraftPlayerInput {
	username: string
}

export interface CreateHistoricalMinecraftPlayerResult {
	id: string
	username: string
	uuid: string
	created: boolean
}

export const resolveOfflineMinecraftIdentity = (
	usernameInput: string,
): OfflineMinecraftIdentity => {
	const username = usernameInput.trim()
	if (!MINECRAFT_USERNAME_PATTERN.test(username)) {
		throw createBadRequestError('HISTORICAL_PLAYER_USERNAME_INVALID')
	}

	const hash = createHash('md5')
		.update(`OfflinePlayer:${username}`, 'utf8')
		.digest()
	const versionByte = hash.at(6)
	const variantByte = hash.at(8)
	if (versionByte === undefined || variantByte === undefined) {
		throw new Error('MD5_HASH_LENGTH_INVALID')
	}
	hash[6] = (versionByte & 0x0f) | 0x30
	hash[8] = (variantByte & 0x3f) | 0x80
	const hex = hash.toString('hex')

	return {
		username,
		normalizedUsername: normalizeMinecraftUsername(username) ?? username,
		uuid: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
	}
}

export const createHistoricalMinecraftPlayer = async (
	input: CreateHistoricalMinecraftPlayerInput,
): Promise<CreateHistoricalMinecraftPlayerResult> => {
	const identity = resolveOfflineMinecraftIdentity(input.username)
	const existing = await prisma.minecraftAccount.findFirst({
		where: {
			OR: [
				{ normalizedUsername: identity.normalizedUsername },
				{ uuid: identity.uuid },
			],
		},
	})

	if (existing) {
		if (existing.identityKind !== 'HISTORICAL') {
			throw createApiError({
				statusCode: 409,
				code: 'HISTORICAL_PLAYER_ALREADY_AUTHENTICATED',
			})
		}
		if (existing.uuid && existing.uuid !== identity.uuid) {
			throw createApiError({
				statusCode: 409,
				code: 'HISTORICAL_PLAYER_UUID_CONFLICT',
			})
		}

		const account =
			existing.uuid === identity.uuid
				? existing
				: await prisma.minecraftAccount.update({
						where: { id: existing.id },
						data: { uuid: identity.uuid },
					})
		return {
			id: account.id,
			username: account.username,
			uuid: account.uuid ?? identity.uuid,
			created: false,
		}
	}

	const account = await prisma.minecraftAccount.create({
		data: {
			username: identity.username,
			normalizedUsername: identity.normalizedUsername,
			uuid: identity.uuid,
			status: 'IMPORTED',
			source: 'MANUAL',
			identityKind: 'HISTORICAL',
			assignmentMode: 'IMPORTED_UNASSIGNED',
		},
	})

	return {
		id: account.id,
		username: account.username,
		uuid: identity.uuid,
		created: true,
	}
}
