import { deleteCookie, getCookie } from 'h3'

const legacyCookieNames = [
	'hydroline_auth',
	'hydroline_refresh',
	'hydcraft_auth',
	'hydcraft_refresh',
]

const legacyDomains = ['.hydcraft.cn', 'hydcraft.cn']

export default defineEventHandler((event) => {
	for (const name of legacyCookieNames) {
		if (!getCookie(event, name)) {
			continue
		}

		deleteCookie(event, name, { path: '/' })

		for (const domain of legacyDomains) {
			deleteCookie(event, name, { path: '/', domain })
		}
	}
})
