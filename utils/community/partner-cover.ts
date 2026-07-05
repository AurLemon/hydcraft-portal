import guangyangScreenshots1 from '~/assets/resources/minecraft-gallery/season_7/guangyang_screenshots_1.webp'
import guangyangScreenshots2 from '~/assets/resources/minecraft-gallery/season_7/guangyang_screenshots_2.webp'
import owenScreenshots2 from '~/assets/resources/minecraft-gallery/season_7/owen_screenshots_2.webp'
import type { PartnerSummary } from './partners'

const partnerFallbackCovers = [
	guangyangScreenshots1,
	guangyangScreenshots2,
	owenScreenshots2,
] as const

const getPartnerCoverIndex = (seed: string): number => {
	let hash = 0

	for (const char of seed) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0
	}

	return hash % partnerFallbackCovers.length
}

export const getPartnerDisplayCover = (
	partner: Pick<PartnerSummary, 'id' | 'name' | 'coverUrl'> | null | undefined,
): string => {
	if (partner?.coverUrl) {
		return partner.coverUrl
	}

	const seed = partner?.id || partner?.name || 'partner-cover'
	return partnerFallbackCovers[getPartnerCoverIndex(seed)]
}
