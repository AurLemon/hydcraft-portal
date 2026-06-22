import { validateCapToken } from '../../../../utils/security/cap'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { submitFriendLinkApplication } from '../../../../utils/friend-links/service'

interface SubmitFriendLinkApplicationBody {
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<SubmitFriendLinkApplicationBody>(event)

	await validateCapToken({
		token: body.captchaToken,
	})

	return await submitFriendLinkApplication(
		user,
		getRouterParam(event, 'id') || '',
		{
			...body,
		},
	)
})
