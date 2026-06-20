import type {
	Prisma,
	PrismaClient,
	UserActivityEventType,
} from '~/generated/prisma/client'

type UserActivityDbClient = PrismaClient | Prisma.TransactionClient

interface UserActivityEventInput {
	userId: string
	type: UserActivityEventType
	occurredAt: Date
	detail?: string | null
	serverName?: string | null
}

export const createUserActivityEvent = async (
	db: UserActivityDbClient,
	input: UserActivityEventInput,
): Promise<void> => {
	await db.userActivityEvent.create({
		data: {
			userId: input.userId,
			type: input.type,
			detail: input.detail ?? null,
			serverName: input.serverName ?? null,
			occurredAt: input.occurredAt,
		},
	})
}

export const upsertUserActivityEvent = async (
	db: UserActivityDbClient,
	input: UserActivityEventInput,
): Promise<void> => {
	await db.userActivityEvent.upsert({
		where: {
			userId_type_occurredAt: {
				userId: input.userId,
				type: input.type,
				occurredAt: input.occurredAt,
			},
		},
		create: {
			userId: input.userId,
			type: input.type,
			detail: input.detail ?? null,
			serverName: input.serverName ?? null,
			occurredAt: input.occurredAt,
		},
		update: {
			detail: input.detail ?? null,
			serverName: input.serverName ?? null,
		},
	})
}
