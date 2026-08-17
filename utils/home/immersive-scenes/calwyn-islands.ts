import { getIntroStaffMember } from '~/utils/intro/staff-members'
import type { HomeImmersiveSceneDefinition } from './types'

const xwTeng = getIntroStaffMember('xwTeng')
const rush = getIntroStaffMember('RUSH132')
const kezzyblue = getIntroStaffMember('Kezzyblue')

if (!xwTeng || !rush || !kezzyblue) {
	throw new Error('Missing shared Calwyn team profile')
}

export const calwynIslandsScene: HomeImmersiveSceneDefinition = {
	id: 'calwyn-islands',
	shortName: {
		'zh-CN': '卡温',
		'zh-TW': '卡溫',
		'en-US': 'Calwyn',
		'ja-JP': 'カルウィン',
	},
	mapAssetsBaseUrl: 'https://map-assets.hydcraft.cn/oxygen/world',
	camera: {
		x: 14012.81,
		y: 63,
		z: 1637.31,
		distance: 3264.93,
		rotation: -0.7144,
		angle: 0.1007,
		tilt: 0,
	},
	lighting: {
		sourceXPercent: 72,
		sourceYPercent: 12,
		directionAngle: -0.65,
		coneSpread: 0.34,
		desktopConeWidth: 0.21,
		mobileConeWidth: 0.17,
		scanXAmplitude: 0.1,
		scanPeriodSeconds: 27,
	},
	players: [
		{
			id: xwTeng.id,
			serverId: 'hydcraft-oxygen',
			nickname: xwTeng.nickname,
			bio: xwTeng.bio,
			focusOrder: 0,
		},
		{
			id: rush.id,
			serverId: 'hydcraft-oxygen',
			nickname: rush.nickname,
			bio: rush.bio,
			focusOrder: 1,
		},
		{
			id: kezzyblue.id,
			serverId: 'hydcraft-oxygen',
			nickname: kezzyblue.nickname,
			bio: kezzyblue.bio,
			focusOrder: 2,
		},
	],
	presentation: {
		skinUsername: xwTeng.id,
		credit: {
			role: 'builder',
			icon: 'i-simple-icons-xiaohongshu',
		},
		locales: {
			'zh-CN': {
				name: '这里是\n卡温\n群岛',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '这里是',
					name: '卡温\n群岛',
				},
				title: '全服细节最完善的自治体。',
				description:
					'你或许会认为内饰是微不足道的东西，但你若是来到了 xwTeng（小万）的卡温群岛，这一想法会被彻底推翻。卡温群岛毗邻欧文群岛，两者都以欧美风与原版建筑闻名全服。卡温更是以细致的内饰、精致的街景一通乱杀。',
				credit: null,
				gallery: [
					{
						asset: 'xwHotelScreenshots1',
						alt: 'XW Hotel 俯瞰图',
						caption: 'XW Hotel 俯瞰图',
					},
					{
						asset: 'xwHotelScreenshots2',
						alt: 'XW Hotel 侧面图',
						caption: 'XW Hotel 侧面图',
					},
				],
			},
			'zh-TW': {
				name: '這裡是\n卡溫\n群島',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '這裡是',
					name: '卡溫\n群島',
				},
				title: '全服細節最完善的自治體。',
				description:
					'你或許會認為內飾是微不足道的東西，但若來到 xwTeng（小萬）的卡溫群島，這一想法將被徹底推翻。卡溫群島毗鄰歐文群島，兩者都以歐美風與原版建築聞名全服。卡溫更以細緻的內飾與精緻的街景令人驚艷。',
				credit: null,
				gallery: [
					{
						asset: 'xwHotelScreenshots1',
						alt: 'XW Hotel 鳥瞰圖',
						caption: 'XW Hotel 鳥瞰圖',
					},
					{
						asset: 'xwHotelScreenshots2',
						alt: 'XW Hotel 側面圖',
						caption: 'XW Hotel 側面圖',
					},
				],
			},
			'en-US': {
				name: 'Calwyn\nArchipelago',
				title: 'The server’s most meticulously detailed autonomous city.',
				description:
					'Interior design may seem insignificant—until you arrive at xwTeng’s Calwyn Archipelago. Neighbouring Owen, both are renowned across the server for Western-inspired architecture built in vanilla Minecraft. Calwyn stands apart through its meticulous interiors and finely composed streetscapes.',
				credit: null,
				gallery: [
					{
						asset: 'xwHotelScreenshots1',
						alt: 'XW Hotel aerial view',
						caption: 'XW Hotel aerial view',
					},
					{
						asset: 'xwHotelScreenshots2',
						alt: 'XW Hotel side view',
						caption: 'XW Hotel side view',
					},
				],
			},
			'ja-JP': {
				name: 'カルウィン\n諸島',
				title: 'サーバー随一、細部まで作り込まれた自治体。',
				description:
					'内装は取るに足らないものだと思うかもしれません。しかし xwTeng（小万）のカルウィン諸島を訪れれば、その考えは覆るでしょう。オーウェン諸島に隣接するカルウィンは、どちらも欧米風とバニラ建築でサーバーに名を知られています。中でもカルウィンは、緻密な内装と洗練された街並みで圧倒します。',
				credit: null,
				gallery: [
					{
						asset: 'xwHotelScreenshots1',
						alt: 'XW Hotel 俯瞰図',
						caption: 'XW Hotel 俯瞰図',
					},
					{
						asset: 'xwHotelScreenshots2',
						alt: 'XW Hotel 側面図',
						caption: 'XW Hotel 側面図',
					},
				],
			},
		},
	},
}
