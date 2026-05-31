export const MINECRAFT_BODY_RENDERER_API_BASE =
	'https://mc-heads.hydcraft.cn/body'

export const getMinecraftBodyRendererUrl = (username: string): string =>
	`${MINECRAFT_BODY_RENDERER_API_BASE}/${username}`
