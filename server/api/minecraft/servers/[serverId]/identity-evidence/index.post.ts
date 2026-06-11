import type {
	Prisma,
	ServerPlayerIdentityEvidenceSource,
} from '~/generated/prisma/client'
import { requireAdminUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import { createServerPlayerIdentityEvidence } from '../../../../../utils/minecraft/identity-evidence'

interface CreateIdentityEvidenceBody {
	source: ServerPlayerIdentityEvidenceSource
	sourceMessageId?: string
	uuid?: string
	username?: string
	uuidSource?: string
	observedAt?: string
	payload?: unknown
}

const evidenceSources = new Set([
	'PORTAL_BRIDGE',
	'PLAYERDATA_SCAN',
	'MANUAL',
	'TEST',
])

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<CreateIdentityEvidenceBody>(event)

	if (!evidenceSources.has(body.source)) {
		throw createBadRequestError('IDENTITY_EVIDENCE_SOURCE_INVALID')
	}

	const evidence = await createServerPlayerIdentityEvidence({
		source: body.source,
		sourceMessageId: body.sourceMessageId,
		serverId,
		uuid: body.uuid,
		username: body.username,
		uuidSource: body.uuidSource,
		observedAt: body.observedAt ? new Date(body.observedAt) : new Date(),
		payload: body.payload as Prisma.InputJsonValue,
	})

	return {
		evidence,
	}
})
