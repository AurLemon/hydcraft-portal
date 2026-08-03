import { readBody } from 'h3'
import { validateTurnstileToken } from '../../../utils/security/turnstile'
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
import { grantDirectorySearchAccess } from '../../../utils/security/directory-search-access'

interface SearchAccessRequestBody {
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<SearchAccessRequestBody>(event)

	await validateTurnstileToken({
		event,
		token: body.captchaToken,
		action: TURNSTILE_ACTIONS.DIRECTORY_SEARCH,
	})

	grantDirectorySearchAccess(event)

	return {
		ok: true,
	}
})
