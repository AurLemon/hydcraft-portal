import { randomInt } from 'node:crypto'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'

const HYDROLINE_RANDOM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

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

const createHydrolineIdCandidate = (joinedAt: Date): string =>
	`H-${formatHydrolineDatePart(joinedAt)}${generateHydrolineRandomPart()}`

interface CreateUniqueHydrolineIdOptions {
	userId?: string
	joinedAt?: Date
	errorCode?: string
	maxAttempts?: number
}

export const createUniqueHydrolineId = async (
	options: CreateUniqueHydrolineIdOptions = {},
): Promise<string> => {
	const {
		userId,
		joinedAt = new Date(),
		errorCode = 'HYDROLINE_ID_CREATE_FAILED',
		maxAttempts = 20,
	} = options

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const hydrolineId = createHydrolineIdCandidate(joinedAt)
		const exists = await prisma.user.findFirst({
			where: {
				hydrolineId,
				...(userId ? { id: { not: userId } } : {}),
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
		code: errorCode,
	})
}
