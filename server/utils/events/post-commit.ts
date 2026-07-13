import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

export interface PostCommitEventMap {
	'user.registered': {
		userId: string
		occurredAt: string
	}
	'minecraft.account.bound': {
		userId: string
		minecraftAccountId: string
		occurredAt: string
	}
	'user.profile.attachment-replaced': {
		userId: string
		purpose: 'user-avatar' | 'user-cover'
		activeAttachmentId: string | null
	}
	'user.oauth.attachment-replaced': {
		userId: string
		externalAccountId: string
		activeAttachmentId: string | null
	}
	'user.oauth.unlinked': {
		userId: string
		provider: string
		externalAccountId: string
		avatarAttachmentId: string | null
		avatarUrl: string | null
	}
	'admin.user.deleted': {
		userId: string
		externalAccountIds: string[]
	}
	'friend-link.attachments.cleanup': {
		linkId: string
		activeAttachmentId: string | null
	}
	'friend-link.attachments.expire': {
		linkId: string
	}
	'friend-link-application.attachments.cleanup': {
		applicationId: string
		activeAttachmentId: string | null
	}
	'friend-link-application.attachments.expire': {
		applicationId: string
	}
	'partner.attachments.cleanup': {
		partnerId: string
		purpose: 'partner-avatar' | 'partner-cover'
		activeAttachmentId: string | null
	}
}

type PostCommitEventName = keyof PostCommitEventMap
type PostCommitEventHandler<TEvent extends PostCommitEventName> = (input: {
	eventId: string
	payload: PostCommitEventMap[TEvent]
}) => Promise<void>

type PostCommitEventDb = Prisma.TransactionClient | typeof prisma

const handlers = new Map<
	PostCommitEventName,
	PostCommitEventHandler<PostCommitEventName>
>()

const BATCH_SIZE = 25
const MAX_ATTEMPTS = 12
const STALE_LOCK_MS = 5 * 60 * 1000

let draining: Promise<void> | null = null

const retryDelayMs = (attempts: number): number =>
	Math.min(5 * 60 * 1000, 1_000 * 2 ** Math.min(attempts, 8))

const toErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error)

export const onPostCommitEvent = <TEvent extends PostCommitEventName>(
	type: TEvent,
	handler: PostCommitEventHandler<TEvent>,
): void => {
	if (handlers.has(type)) {
		throw new Error(`POST_COMMIT_EVENT_HANDLER_DUPLICATE: ${type}`)
	}

	handlers.set(type, handler as PostCommitEventHandler<PostCommitEventName>)
}

export const enqueuePostCommitEvent = async <
	TEvent extends PostCommitEventName,
>(
	db: PostCommitEventDb,
	type: TEvent,
	payload: PostCommitEventMap[TEvent],
): Promise<void> => {
	await db.postCommitEvent.create({
		data: {
			type,
			payload: payload as Prisma.InputJsonValue,
		},
	})
}

export const queuePostCommitEvent = <TEvent extends PostCommitEventName>(
	type: TEvent,
	payload: PostCommitEventMap[TEvent],
): void => {
	void enqueuePostCommitEvent(prisma, type, payload)
		.then(() => {
			schedulePostCommitEventDrain()
		})
		.catch((error) => {
			console.error('POST_COMMIT_EVENT_ENQUEUE_FAILED', { type, error })
		})
}

const recoverStaleLocks = async (): Promise<void> => {
	await prisma.postCommitEvent.updateMany({
		where: {
			status: 'PROCESSING',
			lockedAt: {
				lt: new Date(Date.now() - STALE_LOCK_MS),
			},
		},
		data: {
			status: 'PENDING',
			lockedAt: null,
		},
	})
}

const processEvent = async (eventId: string): Promise<boolean> => {
	const now = new Date()
	const claimed = await prisma.postCommitEvent.updateMany({
		where: {
			id: eventId,
			status: 'PENDING',
			availableAt: {
				lte: now,
			},
		},
		data: {
			status: 'PROCESSING',
			lockedAt: now,
			attempts: {
				increment: 1,
			},
		},
	})

	if (!claimed.count) {
		return false
	}

	const event = await prisma.postCommitEvent.findUniqueOrThrow({
		where: { id: eventId },
	})
	const handler = handlers.get(event.type as PostCommitEventName)

	if (!handler) {
		await prisma.postCommitEvent.update({
			where: { id: event.id },
			data: {
				status: 'FAILED',
				processedAt: new Date(),
				lastError: `POST_COMMIT_EVENT_HANDLER_MISSING: ${event.type}`,
			},
		})
		return true
	}

	try {
		await handler({
			eventId: event.id,
			payload: event.payload as PostCommitEventMap[PostCommitEventName],
		})
		await prisma.postCommitEvent.update({
			where: { id: event.id },
			data: {
				status: 'COMPLETED',
				processedAt: new Date(),
				lockedAt: null,
				lastError: null,
			},
		})
	} catch (error) {
		const failed = event.attempts >= MAX_ATTEMPTS
		await prisma.postCommitEvent.update({
			where: { id: event.id },
			data: {
				status: failed ? 'FAILED' : 'PENDING',
				availableAt: failed
					? event.availableAt
					: new Date(Date.now() + retryDelayMs(event.attempts)),
				lockedAt: null,
				lastError: toErrorMessage(error).slice(0, 2_000),
			},
		})
		console.error('POST_COMMIT_EVENT_FAILED', {
			eventId: event.id,
			type: event.type,
			attempt: event.attempts,
			error,
		})
	}

	return true
}

export const drainPostCommitEvents = async (): Promise<void> => {
	if (draining) {
		return await draining
	}

	draining = (async () => {
		await recoverStaleLocks()

		for (;;) {
			const events = await prisma.postCommitEvent.findMany({
				where: {
					status: 'PENDING',
					availableAt: {
						lte: new Date(),
					},
				},
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				take: BATCH_SIZE,
				select: { id: true },
			})

			if (!events.length) {
				return
			}

			for (const event of events) {
				await processEvent(event.id)
			}
		}
	})()

	try {
		await draining
	} finally {
		draining = null
	}
}

export const schedulePostCommitEventDrain = (): void => {
	void drainPostCommitEvents().catch((error) => {
		console.error('POST_COMMIT_EVENT_DISPATCHER_FAILED', error)
	})
}
