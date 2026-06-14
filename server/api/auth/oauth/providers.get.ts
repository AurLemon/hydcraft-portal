import {
	getOAuthProviderDefinitions,
	getOAuthProviderSummary,
} from '../../../utils/oauth/providers'

export default defineEventHandler(() => {
	const providers = getOAuthProviderDefinitions()

	return {
		providers: providers.map((definition) =>
			getOAuthProviderSummary(definition),
		),
	}
})
