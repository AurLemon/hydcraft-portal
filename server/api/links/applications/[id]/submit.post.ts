import { validateTurnstileToken } from '../../../../utils/security/turnstile'
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { submitFriendLinkApplication } from '../../../../utils/friend-links/service'

interface SubmitFriendLinkApplicationBody {
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<SubmitFriendLinkApplicationBody>(event)

	await validateTurnstileToken({
		event,
		token: body.captchaToken,
		action: TURNSTILE_ACTIONS.FRIEND_LINK_APPLICATION,
	})

	return await submitFriendLinkApplication(
		user,
		getRouterParam(event, 'id') || '',
		{
			...body,
		},
	)
})
