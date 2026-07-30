import apprenticeIcon from '~/assets/resources/profile/builder-ranks/apprentice.png'
import chiefIcon from '~/assets/resources/profile/builder-ranks/chief.png'
import practicingIcon from '~/assets/resources/profile/builder-ranks/practicing.png'
import seniorIcon from '~/assets/resources/profile/builder-ranks/senior.png'

export const builderRankValues = [
	'CHIEF',
	'SENIOR',
	'PRACTICING',
	'APPRENTICE',
] as const

export type BuilderRank = (typeof builderRankValues)[number]
export type BuilderRankLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP'

export interface BuilderRankComments {
	zhCn: string | null
	zhTw: string | null
	enUs: string | null
	jaJp: string | null
}

export interface BuilderRankSummary {
	rank: BuilderRank
	comments: BuilderRankComments
}

const builderRankVisuals: Record<
	BuilderRank,
	{
		icon: string
		titleClass: string
		englishLabel: string
	}
> = {
	CHIEF: {
		icon: chiefIcon,
		titleClass: 'text-amber-700 dark:text-amber-300',
		englishLabel: 'Chief Architect',
	},
	SENIOR: {
		icon: seniorIcon,
		titleClass: 'text-yellow-700 dark:text-yellow-300',
		englishLabel: 'Senior Architect',
	},
	PRACTICING: {
		icon: practicingIcon,
		titleClass: 'text-sky-700 dark:text-sky-300',
		englishLabel: 'Practicing Architect',
	},
	APPRENTICE: {
		icon: apprenticeIcon,
		titleClass: 'text-emerald-700 dark:text-emerald-300',
		englishLabel: 'Apprentice Architect',
	},
}

const charterAnchors: Record<BuilderRankLocale, string> = {
	'zh-CN': '#建筑职阶',
	'zh-TW': '#建築職階',
	'en-US': '#builder-ranks',
	'ja-JP': '#建築ランク',
}

export const getBuilderRankVisual = (rank: BuilderRank) =>
	builderRankVisuals[rank]

export const getBuilderRankCharterAnchor = (
	locale: BuilderRankLocale,
): string => charterAnchors[locale]

export const getBuilderRankComment = (
	comments: BuilderRankComments,
	locale: BuilderRankLocale,
): string | null => {
	switch (locale) {
		case 'zh-CN':
			return comments.zhCn
		case 'zh-TW':
			return comments.zhTw
		case 'ja-JP':
			return comments.jaJp
		default:
			return comments.enUs
	}
}
