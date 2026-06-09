import { requireCurrentUser } from '../../../utils/auth/session'
import { getEditableUserProfile } from '../../../utils/profile/queries'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const profile = await getEditableUserProfile(user.id)

	return {
		profile,
	}
})
