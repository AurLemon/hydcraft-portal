import { requireCurrentUser } from '../../../utils/auth/session'
import { updateEditableUserProfile } from '../../../utils/profile/updates'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody(event)
	const profile = await updateEditableUserProfile(event, user, body)

	return {
		profile,
	}
})
