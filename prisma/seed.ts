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
	username: 'AurLemon',
	hydrolineId: 'H-2601280B23HS',
	displayName: 'AurLemon',
	role: 'OWNER' as const,
	joinedAt: new Date('2018-09-01T00:00:00.000Z'),
	createdAt: new Date('2026-01-28T00:00:00.000Z'),
	bio: 'HydCraft 社区的建筑与红石爱好者，热爱红石与建筑设计，喜欢在服务器上与大家一起创造有趣的故事。',
	location: '上海，中国',
	countryOrRegion: '中国内地',
	gender: 'UNSPECIFIED' as const,
	avatarUrl: null,
	coverUrl: null,
	email: 'example@mail.com',
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
			username: defaultOwner.username,
			hydrolineId: defaultOwner.hydrolineId,
			displayName: defaultOwner.displayName,
			role: defaultOwner.role,
			joinedAt: defaultOwner.joinedAt,
			createdAt: defaultOwner.createdAt,
			bio: defaultOwner.bio,
			location: defaultOwner.location,
			countryOrRegion: defaultOwner.countryOrRegion,
			gender: defaultOwner.gender,
			avatarUrl: defaultOwner.avatarUrl,
			coverUrl: defaultOwner.coverUrl,
			email: defaultOwner.email,
			emailVerifiedAt: null,
			verified: true,
			verifiedTextZhCn: 'HydCraft 官方认证账号',
			verifiedTextZhTw: 'HydCraft 官方認證帳號',
			verifiedTextEnUs: 'Verified HydCraft account',
			verifiedTextJaJp: 'HydCraft 認証済みアカウント',
		},
		update: {
			username: defaultOwner.username,
			hydrolineId: defaultOwner.hydrolineId,
			displayName: defaultOwner.displayName,
			role: defaultOwner.role,
			joinedAt: defaultOwner.joinedAt,
			createdAt: defaultOwner.createdAt,
			bio: defaultOwner.bio,
			location: defaultOwner.location,
			countryOrRegion: defaultOwner.countryOrRegion,
			gender: defaultOwner.gender,
			avatarUrl: defaultOwner.avatarUrl,
			coverUrl: defaultOwner.coverUrl,
			email: defaultOwner.email,
			emailVerifiedAt: null,
			verified: true,
			verifiedTextZhCn: 'HydCraft 官方认证账号',
			verifiedTextZhTw: 'HydCraft 官方認證帳號',
			verifiedTextEnUs: 'Verified HydCraft account',
			verifiedTextJaJp: 'HydCraft 認証済みアカウント',
		},
	})

	console.log(`Seed owner ensured: ${defaultOwner.handle}`)

	await prisma.userEmail.upsert({
		where: {
			email: defaultOwner.email,
		},
		create: {
			userId: owner.id,
			email: defaultOwner.email,
			kind: 'PRIMARY',
			verifiedAt: null,
		},
		update: {
			userId: owner.id,
			kind: 'PRIMARY',
			verifiedAt: null,
		},
	})

	console.log(`Seed owner primary email ensured: ${defaultOwner.email}`)

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

	await prisma.userProfile.upsert({
		where: {
			userId: owner.id,
		},
		create: {
			userId: owner.id,
			h2wikiPageName: 'aurlemon',
			githubUsername: 'AurLemon',
			websiteUrl: 'https://aurlemon.dev/',
			bilibiliUrl: 'https://space.bilibili.com/12345678',
			qqNumber: '12345678',
			wechatId: 'AurLemon',
			publicEmail: 'hello@aurlemon.dev',
		},
		update: {
			h2wikiPageName: 'aurlemon',
			githubUsername: 'AurLemon',
			websiteUrl: 'https://aurlemon.dev/',
			bilibiliUrl: 'https://space.bilibili.com/12345678',
			qqNumber: '12345678',
			wechatId: 'AurLemon',
			publicEmail: 'hello@aurlemon.dev',
		},
	})

	await prisma.userProfilePreferences.upsert({
		where: {
			userId: owner.id,
		},
		create: {
			userId: owner.id,
			language: 'ZH_CN',
			timezoneMode: 'AUTO',
			timezone: 'Asia/Shanghai',
		},
		update: {
			language: 'ZH_CN',
			timezoneMode: 'AUTO',
			timezone: 'Asia/Shanghai',
		},
	})

	await prisma.userProfilePrivacy.upsert({
		where: {
			userId: owner.id,
		},
		create: {
			userId: owner.id,
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
		},
		update: {
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
		},
	})

	const senateBadge = await prisma.profileBadge.upsert({
		where: {
			key: 'senate-member',
		},
		create: {
			key: 'senate-member',
			labelZhCn: '元老院成员',
			labelZhTw: '元老院成員',
			labelEnUs: 'Senate Member',
			labelJaJp: '元老院メンバー',
			color: 'amber',
			icon: 'i-lucide-star',
			description: 'HydCraft early core community member badge.',
			enabled: true,
			sortOrder: 0,
		},
		update: {
			labelZhCn: '元老院成员',
			labelZhTw: '元老院成員',
			labelEnUs: 'Senate Member',
			labelJaJp: '元老院メンバー',
			color: 'amber',
			icon: 'i-lucide-star',
			description: 'HydCraft early core community member badge.',
			enabled: true,
			sortOrder: 0,
		},
	})

	await prisma.userProfileBadge.upsert({
		where: {
			userId_badgeId: {
				userId: owner.id,
				badgeId: senateBadge.id,
			},
		},
		create: {
			userId: owner.id,
			badgeId: senateBadge.id,
			sortOrder: 0,
		},
		update: {
			label: null,
			color: null,
			sortOrder: 0,
		},
	})

	console.log(`Seed profile ensured: ${defaultOwner.username}`)
}

try {
	await main()
} finally {
	await prisma.$disconnect()
}
