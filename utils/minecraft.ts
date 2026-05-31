export const MINECRAFT_BODY_API_BASE = 'https://mc-heads.hydcraft.cn/body'

export const getMinecraftBodyUrl = (username: string): string =>
	`${MINECRAFT_BODY_API_BASE}/${username}`
