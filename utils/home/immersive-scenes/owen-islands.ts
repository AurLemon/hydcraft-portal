import type { HomeImmersiveSceneDefinition } from './types'
import { getIntroStaffMember } from '~/utils/intro/staff-members'

const catPillager = getIntroStaffMember('CatPillager')

if (!catPillager) {
	throw new Error('Missing shared staff profile for CatPillager')
}

export const owenIslandsScene: HomeImmersiveSceneDefinition = {
	id: 'owen-islands',
	shortName: {
		'zh-CN': '欧文',
		'zh-TW': '歐文',
		'en-US': 'Owen',
		'ja-JP': 'オーウェン',
	},
	mapAssetsBaseUrl: 'https://map.oxygen.hydcraft.cn/maps/world',
	mapAssetsFallbackBaseUrls: ['https://map-assets.hydcraft.cn/oxygen/world'],
	camera: {
		x: 13874.57,
		y: 63,
		z: 9773.19,
		distance: 3264.93,
		rotation: -0.5999,
		angle: 0.5044,
		tilt: 0,
	},
	lighting: {
		sourceXPercent: 89,
		sourceYPercent: 3,
		directionAngle: -0.96,
		coneSpread: 0.38,
		desktopConeWidth: 0.24,
		mobileConeWidth: 0.2,
		scanXAmplitude: 0.12,
		scanPeriodSeconds: 24,
	},
	players: [
		{
			id: catPillager.id,
			serverId: 'hydcraft-oxygen',
			nickname: catPillager.nickname,
			bio: catPillager.bio,
			portalUsername: catPillager.portalUsername,
			focusOrder: 0,
		},
	],
	presentation: {
		skinUsername: 'CatPillager',
		credit: {
			role: 'builder',
			icon: 'i-simple-icons-xiaohongshu',
		},
		locales: {
			'zh-CN': {
				name: '这里是\n欧文群岛',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '这里是',
					name: '欧文\n群岛',
				},
				title: '服务器中最独特的自治体。',
				description:
					'欧文群岛是服务器最特殊的自治体之一。近乎由 CatPillager（仓鼠）一人统筹的体系，让精致的欧美建筑和优雅的道路曲线塑造出了完美无瑕的欧文。全服中，他是欧文绝对的 Leader，纵然是服主柠檬都无法插手。',
				credit: {
					handle: '@Cat_Pillager',
					href: 'https://xhslink.cn/m/6FNeCc1V9q1',
				},
				gallery: [
					{
						asset: 'owenCoastConcert1',
						alt: '欧文滨海音乐厅',
						caption: '欧文滨海音乐厅',
					},
					{
						asset: 'owenWpgh1',
						alt: '威尔斯综合医疗中心',
						caption: '威尔斯综合医疗中心',
					},
				],
			},
			'zh-TW': {
				name: '這裡是\n歐文群島',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '這裡是',
					name: '歐文\n群島',
				},
				title: '伺服器中最獨特的自治體。',
				description:
					'歐文群島是伺服器最特殊的自治體之一。近乎由 CatPillager（倉鼠）一人統籌的體系，讓精緻的歐美建築和優雅的道路曲線塑造出了完美無瑕的歐文。全服中，他是歐文絕對的 Leader，縱然是服主檸檬都無法插手。',
				credit: {
					handle: '@Cat_Pillager',
					href: 'https://xhslink.cn/m/6FNeCc1V9q1',
				},
				gallery: [
					{
						asset: 'owenCoastConcert1',
						alt: '歐文濱海音樂廳',
						caption: '歐文濱海音樂廳',
					},
					{
						asset: 'owenWpgh1',
						alt: '威爾斯綜合醫療中心',
						caption: '威爾斯綜合醫療中心',
					},
				],
			},
			'en-US': {
				name: 'Owen\nArchipelago',
				title: "The server's most distinctive autonomous city.",
				description:
					"Owen is a distinctive autonomous community. CatPillager alone shaped its Western architecture and graceful roads. He is Owen's Leader—even AurLemon cannot intervene.",
				credit: {
					handle: '@Cat_Pillager',
					href: 'https://xhslink.cn/m/6FNeCc1V9q1',
				},
				gallery: [
					{
						asset: 'owenCoastConcert1',
						alt: 'Owen Coastal Concert Hall',
						caption: 'Owen Coastal Concert Hall',
					},
					{
						asset: 'owenWpgh1',
						alt: 'Wells General Hospital',
						caption: 'Wells General Hospital',
					},
				],
			},
			'ja-JP': {
				name: 'オーウェン\n諸島',
				title: 'サーバーで最も個性的な自治体。',
				description:
					'オーウェン諸島は特別な自治体です。CatPillager がほぼ一人で欧米風建築と優雅な道路を築きました。彼はオーウェンの Leader であり、AurLemon でさえ干渉できません。',
				credit: {
					handle: '@Cat_Pillager',
					href: 'https://xhslink.cn/m/6FNeCc1V9q1',
				},
				gallery: [
					{
						asset: 'owenCoastConcert1',
						alt: 'オーウェン海浜音楽ホール',
						caption: 'オーウェン海浜音楽ホール',
					},
					{
						asset: 'owenWpgh1',
						alt: 'ウェルズ総合医療センター',
						caption: 'ウェルズ総合医療センター',
					},
				],
			},
		},
	},
}
