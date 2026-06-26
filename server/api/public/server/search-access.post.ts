import { readBody } from 'h3'
import { validateCapToken } from '../../../utils/security/cap'
import { grantDirectorySearchAccess } from '../../../utils/security/directory-search-access'

interface SearchAccessRequestBody {
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<SearchAccessRequestBody>(event)

	await validateCapToken({
		token: body.captchaToken,
	})

	grantDirectorySearchAccess(event)

	return {
		ok: true,
	}
})
