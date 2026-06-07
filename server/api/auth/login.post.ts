import { prisma } from '../../utils/db/prisma'
import { verifyPassword } from '../../utils/auth/password'
import { issueAuthCookies, toUserSummary } from '../../utils/auth/session'
import { normalizeEmail, normalizeHandle } from '../../utils/auth/validation'

interface LoginBody {
	handleOrEmail: string
	password: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<LoginBody>(event)
	const login = body.handleOrEmail?.trim() ?? ''
	const normalizedLogin = login.includes('@')
		? normalizeEmail(login)
		: normalizeHandle(login)
	const user = await prisma.user.findFirst({
		where: {
			OR: [
				{
					handle: normalizedLogin ?? '',
				},
				{
					email: normalizedLogin,
				},
			],
		},
		include: {
			credential: true,
		},
	})

	if (
		!user ||
		!user.credential ||
		user.status !== 'ACTIVE' ||
		!(await verifyPassword(body.password ?? '', user.credential.passwordHash))
	) {
		throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
	}

	const updatedUser = await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			lastLoginAt: new Date(),
		},
	})
	const token = await issueAuthCookies(event, updatedUser)

	return {
		token,
		user: toUserSummary(updatedUser),
	}
})
