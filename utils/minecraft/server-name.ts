export interface MinecraftServerLocalizedName {
	nameZhCn: string
	nameZhTw: string
	nameEnUs: string
	nameJaJp: string
}

export const resolveMinecraftServerLocalizedName = (
	names: MinecraftServerLocalizedName,
	locale: string,
): string => {
	switch (locale) {
		case 'zh-TW':
			return names.nameZhTw || names.nameZhCn
		case 'en-US':
			return names.nameEnUs || names.nameZhCn
		case 'ja-JP':
			return names.nameJaJp || names.nameZhCn
		default:
			return names.nameZhCn
	}
}

export const toMinecraftServerLocalizedName = (input: {
	nameZhCn: string
	nameZhTw?: string | null
	nameEnUs?: string | null
	nameJaJp?: string | null
}): MinecraftServerLocalizedName => ({
	nameZhCn: input.nameZhCn,
	nameZhTw: input.nameZhTw?.trim() || input.nameZhCn,
	nameEnUs: input.nameEnUs?.trim() || input.nameZhCn,
	nameJaJp: input.nameJaJp?.trim() || input.nameZhCn,
})
