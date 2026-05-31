import { queryCollection } from '@nuxt/content/nitro'

export default defineEventHandler(async (event) => {
	const locale = getRouterParam(event, 'locale') || 'zh-cn'
	const page = getRouterParam(event, 'page') || 'index'
	const normalizedPage = page.replace(/^\/+|\/+$/g, '')

	return await queryCollection(event, 'content')
		.path(`/${locale}/${normalizedPage}`)
		.first()
})
