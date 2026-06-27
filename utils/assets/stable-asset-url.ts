export const getStableAssetUrl = (src: string): string =>
	src.replace(/\?t=\d+$/, '')
