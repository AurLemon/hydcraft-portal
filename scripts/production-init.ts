import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import {
	PrismaClient,
	type FriendLink,
	type PartnerEntry,
} from '../generated/prisma/client.js'
import type {
	FriendLinkCategory,
	PartnerSection,
} from '../generated/prisma/enums.js'
import { hashPassword } from '../server/utils/auth/password.js'
import { productionInitConfig } from './config/production-init.js'

interface CliOptions {
	scopes: Set<ProductionInitScope>
}

interface ScopeExecutionResult {
	created: number
	updated: number
}

type ProductionInitScope = 'owner' | 'links' | 'partners'

const DEFAULT_SCOPES: ProductionInitScope[] = ['owner', 'links', 'partners']

const pool = new Pool({
	connectionString: process.env.DATABASE_URL ?? '',
})

const adapter = new PrismaPg(pool, {
	disposeExternalPool: true,
})

const prisma = new PrismaClient({
	adapter,
})

const parseCliOptions = (): CliOptions => {
	const onlyArg = process.argv
		.slice(2)
		.find((argument) => argument.startsWith('--only='))

	if (!onlyArg) {
		return {
			scopes: new Set(DEFAULT_SCOPES),
		}
	}

	const requestedScopes = onlyArg
		.slice('--only='.length)
		.split(',')
		.map((scope) => scope.trim())
		.filter(Boolean)

	const scopes = new Set<ProductionInitScope>()

	for (const scope of requestedScopes) {
		if (scope === 'owner' || scope === 'links' || scope === 'partners') {
			scopes.add(scope)
			continue
		}

		throw new Error(`PRODUCTION_INIT_SCOPE_INVALID:${scope}`)
	}

	if (!scopes.size) {
		throw new Error('PRODUCTION_INIT_SCOPE_EMPTY')
	}

	return { scopes }
}

const ensureOwner = async (): Promise<void> => {
	const ownerConfig = productionInitConfig.owner
	const email = ownerConfig.email
	const password = ownerConfig.password

	const owner = await prisma.user.upsert({
		where: {
			handle: ownerConfig.handle,
		},
		create: {
			handle: ownerConfig.handle,
			username: ownerConfig.username,
			hydrolineId: ownerConfig.hydrolineId,
			displayName: ownerConfig.displayName,
			role: ownerConfig.role,
			joinedAt: ownerConfig.joinedAt,
			createdAt: ownerConfig.createdAt,
			bio: ownerConfig.bio,
			location: ownerConfig.location,
			countryOrRegion: ownerConfig.countryOrRegion,
			gender: ownerConfig.gender,
			email,
			emailVerifiedAt: null,
			verified: ownerConfig.verified,
			verifiedTextZhCn: ownerConfig.verifiedTextZhCn,
			verifiedTextZhTw: ownerConfig.verifiedTextZhTw,
			verifiedTextEnUs: ownerConfig.verifiedTextEnUs,
			verifiedTextJaJp: ownerConfig.verifiedTextJaJp,
		},
		update: {
			username: ownerConfig.username,
			hydrolineId: ownerConfig.hydrolineId,
			displayName: ownerConfig.displayName,
			role: ownerConfig.role,
			joinedAt: ownerConfig.joinedAt,
			createdAt: ownerConfig.createdAt,
			bio: ownerConfig.bio,
			location: ownerConfig.location,
			countryOrRegion: ownerConfig.countryOrRegion,
			gender: ownerConfig.gender,
			email,
			emailVerifiedAt: null,
			verified: ownerConfig.verified,
			verifiedTextZhCn: ownerConfig.verifiedTextZhCn,
			verifiedTextZhTw: ownerConfig.verifiedTextZhTw,
			verifiedTextEnUs: ownerConfig.verifiedTextEnUs,
			verifiedTextJaJp: ownerConfig.verifiedTextJaJp,
		},
	})

	await prisma.userEmail.upsert({
		where: {
			email,
		},
		create: {
			userId: owner.id,
			email,
			kind: 'PRIMARY',
			verifiedAt: null,
		},
		update: {
			userId: owner.id,
			kind: 'PRIMARY',
			verifiedAt: null,
		},
	})

	await prisma.userCredential.upsert({
		where: {
			userId: owner.id,
		},
		create: {
			userId: owner.id,
			passwordHash: await hashPassword(password),
		},
		update: {
			passwordHash: await hashPassword(password),
		},
	})

	await prisma.userProfile.upsert({
		where: {
			userId: owner.id,
		},
		create: {
			userId: owner.id,
			...ownerConfig.profile,
		},
		update: ownerConfig.profile,
	})

	await prisma.userProfilePreferences.upsert({
		where: {
			userId: owner.id,
		},
		create: {
			userId: owner.id,
			...ownerConfig.preferences,
		},
		update: ownerConfig.preferences,
	})

	await prisma.userProfilePrivacy.upsert({
		where: {
			userId: owner.id,
		},
		create: {
			userId: owner.id,
			...ownerConfig.privacy,
		},
		update: ownerConfig.privacy,
	})

	await prisma.userActivityEvent.upsert({
		where: {
			userId_type_occurredAt: {
				userId: owner.id,
				type: 'REGISTERED',
				occurredAt: ownerConfig.createdAt,
			},
		},
		create: {
			userId: owner.id,
			type: 'REGISTERED',
			occurredAt: ownerConfig.createdAt,
		},
		update: {},
	})

	console.log(`[production-init] owner ensured: ${owner.handle}`)
}

const findMatchingFriendLink = async (
	name: string,
	category: FriendLinkCategory,
): Promise<FriendLink | null> => {
	const matches = await prisma.friendLink.findMany({
		where: {
			name,
			category,
		},
		take: 2,
	})

	if (matches.length > 1) {
		throw new Error(`PRODUCTION_INIT_FRIEND_LINK_AMBIGUOUS:${category}:${name}`)
	}

	return matches[0] ?? null
}

const ensureFriendLinks = async (): Promise<ScopeExecutionResult> => {
	let created = 0
	let updated = 0

	for (const linkConfig of productionInitConfig.friendLinks) {
		const existing = await findMatchingFriendLink(
			linkConfig.name,
			linkConfig.category,
		)

		if (!existing) {
			await prisma.friendLink.create({
				data: {
					name: linkConfig.name,
					category: linkConfig.category,
					url: linkConfig.url,
					summary: linkConfig.summary,
					enabled: linkConfig.enabled,
					archived: linkConfig.archived,
				},
			})
			created += 1
			console.log(
				`[production-init] friend link created: ${linkConfig.category}/${linkConfig.name}`,
			)
			continue
		}

		await prisma.friendLink.update({
			where: {
				id: existing.id,
			},
			data: {
				url: linkConfig.url,
				summary: linkConfig.summary,
				enabled: linkConfig.enabled,
				archived: linkConfig.archived,
			},
		})
		updated += 1
		console.log(
			`[production-init] friend link updated: ${linkConfig.category}/${linkConfig.name}`,
		)
	}

	return { created, updated }
}

const findMatchingPartner = async (
	name: string,
	section: PartnerSection,
): Promise<PartnerEntry | null> => {
	const matches = await prisma.partnerEntry.findMany({
		where: {
			name,
			section,
		},
		take: 2,
	})

	if (matches.length > 1) {
		throw new Error(`PRODUCTION_INIT_PARTNER_AMBIGUOUS:${section}:${name}`)
	}

	return matches[0] ?? null
}

const ensurePartners = async (): Promise<ScopeExecutionResult> => {
	let created = 0
	let updated = 0

	for (const partnerConfig of productionInitConfig.partners) {
		const existing = await findMatchingPartner(
			partnerConfig.name,
			partnerConfig.section,
		)

		if (!existing) {
			await prisma.partnerEntry.create({
				data: {
					name: partnerConfig.name,
					section: partnerConfig.section,
					kind: partnerConfig.kind,
					summary: partnerConfig.summary,
					websiteUrl: partnerConfig.websiteUrl,
					enabled: partnerConfig.enabled,
					archived: partnerConfig.archived,
					relationshipEstablishedAt: partnerConfig.relationshipEstablishedAt,
					sortOrder: partnerConfig.sortOrder,
				},
			})
			created += 1
			console.log(
				`[production-init] partner created: ${partnerConfig.section}/${partnerConfig.name}`,
			)
			continue
		}

		await prisma.partnerEntry.update({
			where: {
				id: existing.id,
			},
			data: {
				kind: partnerConfig.kind,
				summary: partnerConfig.summary,
				websiteUrl: partnerConfig.websiteUrl,
				enabled: partnerConfig.enabled,
				archived: partnerConfig.archived,
				relationshipEstablishedAt: partnerConfig.relationshipEstablishedAt,
				sortOrder: partnerConfig.sortOrder,
			},
		})
		updated += 1
		console.log(
			`[production-init] partner updated: ${partnerConfig.section}/${partnerConfig.name}`,
		)
	}

	return { created, updated }
}

const main = async (): Promise<void> => {
	const options = parseCliOptions()

	if (options.scopes.has('owner')) {
		await ensureOwner()
	}

	if (options.scopes.has('links')) {
		const result = await ensureFriendLinks()
		console.log(
			`[production-init] friend links synced: created=${result.created}, updated=${result.updated}`,
		)
	}

	if (options.scopes.has('partners')) {
		const result = await ensurePartners()
		console.log(
			`[production-init] partners synced: created=${result.created}, updated=${result.updated}`,
		)
	}
}

try {
	await main()
} finally {
	await prisma.$disconnect()
}
