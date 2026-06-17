export const MINECRAFT_BODY_RENDERER_API_BASE =
	'https://mc-heads.hydcraft.cn/body'
export const MINECRAFT_HEAD_RENDERER_API_BASE =
	'https://mc-heads.hydcraft.cn/head'

export const getMinecraftBodyRendererUrl = (username: string): string =>
	`${MINECRAFT_BODY_RENDERER_API_BASE}/${username}`

export const getMinecraftHeadRendererUrl = (username: string): string =>
	`${MINECRAFT_HEAD_RENDERER_API_BASE}/${encodeURIComponent(
		username.toUpperCase(),
	)}`
