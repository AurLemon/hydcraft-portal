const SITE_MEDIA_BASE_URL = 'https://img.hydcraft.cn'

export const getSiteMediaUrl = (path: string): string =>
	`${SITE_MEDIA_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
