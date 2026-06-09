import { prisma } from '../../utils/db/prisma'
import { hashPassword } from '../../utils/auth/password'
import { issueAuthCookies, toUserSummary } from '../../utils/auth/session'
import {
	assertHandle,
	assertPassword,
	normalizeEmail,
} from '../../utils/auth/validation'
import {
	createUniqueHydrolineId,
	ensureUserProfileDefaults,
} from '../../utils/profile/defaults'

interface RegisterBody {
	handle: string
	password: string
	displayName?: string
	email?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<RegisterBody>(event)
	const handle = assertHandle(body.handle ?? '')
	const password = assertPassword(body.password ?? '')
	const email = normalizeEmail(body.email)
	const passwordHash = await hashPassword(password)
	const hydrolineId = await createUniqueHydrolineId()

	const user = await prisma.user.create({
		data: {
			handle,
			username: handle,
			hydrolineId,
			displayName: body.displayName?.trim() || null,
			email,
			role: 'USER',
			status: 'ACTIVE',
			credential: {
				create: {
					passwordHash,
				},
			},
		},
	})
	await ensureUserProfileDefaults(user.id)
	const token = await issueAuthCookies(event, user)
	const userWithPreferences = await prisma.user.findUniqueOrThrow({
		where: {
			id: user.id,
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})

	return {
		token,
		user: toUserSummary(userWithPreferences),
	}
})
