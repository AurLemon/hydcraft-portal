export const MINECRAFT_BODY_RENDERER_API_BASE =
	'https://mc-heads.hydcraft.cn/body'
export const MINECRAFT_HEAD_RENDERER_API_BASE =
	'https://mc-heads.hydcraft.cn/head'
export const MINECRAFT_AVATAR_RENDERER_API_BASE =
	'https://mc-heads.hydcraft.cn/avatar'
export const MINECRAFT_SKIN_RENDERER_API_BASE =
	'https://mc-heads.hydcraft.cn/skin'

export const getMinecraftBodyRendererUrl = (username: string): string =>
	`${MINECRAFT_BODY_RENDERER_API_BASE}/${username}`

export const getMinecraftHeadRendererUrl = (username: string): string =>
	`${MINECRAFT_HEAD_RENDERER_API_BASE}/${encodeURIComponent(username)}`

export const getMinecraftAvatarRendererUrl = (key: string): string =>
	`${MINECRAFT_AVATAR_RENDERER_API_BASE}/${encodeURIComponent(key)}`

export const getMinecraftSkinRendererUrl = (key: string): string =>
	`${MINECRAFT_SKIN_RENDERER_API_BASE}/${encodeURIComponent(key)}`
