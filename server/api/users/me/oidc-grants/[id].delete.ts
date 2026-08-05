import { requireCurrentUser } from '~/server/utils/auth/session'
import { createBadRequestError } from '~/server/utils/errors'
import { revokeOAuthClientGrant } from '~/server/utils/oauth-provider/service'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const grantId = getRouterParam(event, 'id')

	if (!grantId) {
		throw createBadRequestError('OAUTH_GRANT_ID_REQUIRED')
	}

	await revokeOAuthClientGrant(user.id, grantId)

	return {
		ok: true,
	}
})
