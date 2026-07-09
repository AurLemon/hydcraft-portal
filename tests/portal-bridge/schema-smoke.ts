import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'
import { registerMinecraftProjectionHandlers } from '../../server/utils/minecraft/identity-projection'
import { createServerPlayerIdentityEvidence } from '../../server/utils/minecraft/identity-evidence'

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL ?? '',
})
const prisma = new PrismaClient({
	adapter,
})

const testServerId = 'test-portal-bridge'
const testUuid = '00000000-0000-0000-0000-000000000001'
const testUsername = 'Test_Player'
const testSourceMessageId = 'schema-smoke-identity-evidence'

const printOk = (message: string): void => {
	console.log(`[ok] ${message}`)
}

const assert = (condition: boolean, message: string): void => {
	if (!condition) {
		throw new Error(message)
	}
}

const cleanup = async (): Promise<void> => {
	await prisma.serverPlayerIdentityEvidence.deleteMany({
		where: {
			source: 'TEST',
			sourceMessageId: testSourceMessageId,
		},
	})
	await prisma.minecraftServer.deleteMany({
		where: {
			serverId: testServerId,
		},
	})
}

async function main() {
	registerMinecraftProjectionHandlers()

	await prisma.$queryRaw`SELECT 1`
	printOk('database connected')

	const rolesBefore = await prisma.user.findMany({
		select: {
			id: true,
			role: true,
		},
		orderBy: {
			id: 'asc',
		},
	})

	await cleanup()

	await prisma.minecraftServer.upsert({
		where: {
			serverId: testServerId,
		},
		create: {
			serverId: testServerId,
			code: 'schema-smoke',
			shortCode: 'SMOKE',
			nameZhCn: 'Schema Smoke Test',
			nameZhTw: 'Schema Smoke Test',
			nameEnUs: 'Schema Smoke Test',
			nameJaJp: 'Schema Smoke Test',
			host: '127.0.0.1',
			port: 25565,
		},
		update: {
			code: 'schema-smoke',
			shortCode: 'SMOKE',
			nameZhCn: 'Schema Smoke Test',
			nameZhTw: 'Schema Smoke Test',
			nameEnUs: 'Schema Smoke Test',
			nameJaJp: 'Schema Smoke Test',
		},
	})
	printOk('minecraft server upserted')

	await prisma.minecraftServerSnapshot.create({
		data: {
			serverId: testServerId,
			kind: 'SERVER_STATUS',
			observedAt: new Date(),
			payload: {
				fixture: 'schema-smoke',
				online: false,
			},
		},
	})
	printOk('server snapshot written')

	await createServerPlayerIdentityEvidence({
		source: 'TEST',
		sourceMessageId: testSourceMessageId,
		serverId: testServerId,
		uuid: testUuid,
		username: testUsername,
		uuidSource: 'TEST_FIXTURE',
		observedAt: new Date(),
		payload: {
			fixture: 'schema-smoke',
		},
	})
	printOk('identity evidence written')

	const identity = await prisma.serverPlayerIdentity.findUnique({
		where: {
			serverId_uuid: {
				serverId: testServerId,
				uuid: testUuid,
			},
		},
	})

	assert(Boolean(identity), 'server player identity was not projected')
	printOk('server player identity projected')
	assert(
		identity?.normalizedUsername === 'test_player',
		'normalized username is not lowercase',
	)
	printOk('normalized username stable')

	const verifiedAccount = await prisma.minecraftAccount.findFirst({
		where: {
			uuid: testUuid,
			status: 'VERIFIED',
		},
	})

	assert(
		!verifiedAccount,
		'identity evidence must not create a VERIFIED MinecraftAccount',
	)
	printOk('minecraft account was not auto-verified')

	const rolesAfter = await prisma.user.findMany({
		select: {
			id: true,
			role: true,
		},
		orderBy: {
			id: 'asc',
		},
	})

	assert(
		JSON.stringify(rolesAfter) === JSON.stringify(rolesBefore),
		'identity evidence must not modify User.role',
	)
	printOk('user roles unchanged')

	await cleanup()
	printOk('test fixture cleaned')
}

try {
	await main()
} finally {
	await prisma.$disconnect()
}
