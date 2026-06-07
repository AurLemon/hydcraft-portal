import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { hashPassword } from '../server/utils/auth/password'

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL ?? '',
})
const prisma = new PrismaClient({
	adapter,
})

const defaultOwner = {
	handle: 'aurlemon',
	displayName: 'AurLemon',
	role: 'OWNER' as const,
	title: 'Owner',
}

const defaultServer = {
	serverId: 'hydcraft-main',
	code: 'main',
	name: 'HydCraft Main',
	host: '127.0.0.1',
	port: 25565,
}

async function main() {
	const owner = await prisma.user.upsert({
		where: {
			handle: defaultOwner.handle,
		},
		create: {
			handle: defaultOwner.handle,
			displayName: defaultOwner.displayName,
			role: defaultOwner.role,
			title: defaultOwner.title,
		},
		update: {
			role: defaultOwner.role,
			title: defaultOwner.title,
		},
	})

	console.log(`Seed owner ensured: ${defaultOwner.handle}`)

	if (process.env.DEFAULT_OWNER_PASSWORD) {
		await prisma.userCredential.upsert({
			where: {
				userId: owner.id,
			},
			create: {
				userId: owner.id,
				passwordHash: await hashPassword(process.env.DEFAULT_OWNER_PASSWORD),
			},
			update: {
				passwordHash: await hashPassword(process.env.DEFAULT_OWNER_PASSWORD),
			},
		})
		console.log(`Seed owner credential ensured: ${defaultOwner.handle}`)
	}

	await prisma.minecraftServer.upsert({
		where: {
			serverId: defaultServer.serverId,
		},
		create: {
			serverId: defaultServer.serverId,
			code: defaultServer.code,
			name: defaultServer.name,
			host: defaultServer.host,
			port: defaultServer.port,
		},
		update: {
			code: defaultServer.code,
			name: defaultServer.name,
			host: defaultServer.host,
			port: defaultServer.port,
		},
	})

	console.log(`Seed minecraft server ensured: ${defaultServer.serverId}`)
}

try {
	await main()
} finally {
	await prisma.$disconnect()
}
