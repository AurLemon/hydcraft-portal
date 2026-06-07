import { prisma } from '../../utils/db/prisma'
import { hashPassword } from '../../utils/auth/password'
import { issueAuthCookies, toUserSummary } from '../../utils/auth/session'
import {
	assertHandle,
	assertPassword,
	normalizeEmail,
} from '../../utils/auth/validation'

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

	const user = await prisma.user.create({
		data: {
			handle,
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
	const token = await issueAuthCookies(event, user)

	return {
		token,
		user: toUserSummary(user),
	}
})
