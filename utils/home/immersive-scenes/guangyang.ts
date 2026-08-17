import { getIntroStaffMember } from '~/utils/intro/staff-members'
import type { HomeImmersiveSceneDefinition } from './types'

const qixuanjun233 = getIntroStaffMember('qixuanjun233')
const dotkk = getIntroStaffMember('Dotkk')
const xxlm233 = getIntroStaffMember('xxlm233')

if (!qixuanjun233 || !dotkk || !xxlm233) {
	throw new Error('Missing shared Guangyang team profile')
}

export const guangyangScene: HomeImmersiveSceneDefinition = {
	id: 'guangyang',
	shortName: {
		'zh-CN': '广阳',
		'zh-TW': '廣陽',
		'en-US': 'Guangyang',
		'ja-JP': '広陽',
	},
	mapAssetsBaseUrl: 'https://map-assets.hydcraft.cn/oxygen/world',
	camera: {
		x: 4443.83,
		y: 65,
		z: 1195.78,
		distance: 7345.79,
		rotation: -0.7357,
		angle: 0.5105,
		tilt: 0,
	},
	lighting: {
		sourceXPercent: 65,
		sourceYPercent: 18,
		directionAngle: -0.82,
		coneSpread: 0.3,
		desktopConeWidth: 0.24,
		mobileConeWidth: 0.19,
		scanXAmplitude: 0.09,
		scanPeriodSeconds: 31,
	},
	players: [
		{
			id: qixuanjun233.id,
			serverId: 'hydcraft-oxygen',
			nickname: qixuanjun233.nickname,
			bio: qixuanjun233.bio,
			focusOrder: 0,
		},
		{
			id: dotkk.id,
			serverId: 'hydcraft-oxygen',
			nickname: dotkk.nickname,
			bio: dotkk.bio,
			focusOrder: 1,
		},
		{
			id: xxlm233.id,
			serverId: 'hydcraft-oxygen',
			nickname: xxlm233.nickname,
			bio: xxlm233.bio,
			focusOrder: 2,
		},
	],
	presentation: {
		skinUsername: qixuanjun233.id,
		credit: {
			role: 'builder',
			icon: 'i-simple-icons-xiaohongshu',
		},
		locales: {
			'zh-CN': {
				name: '这里是\n广阳\n都市圈',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '这里是',
					name: '广阳\n都市圈',
				},
				title: '全服规模最大的都市圈。',
				description:
					'广阳的已建成面积几乎占据了整个北岛，是全服最大的一个都市圈。在 qixuanjun233（七炫）、Dotkk、xxlm233（宵宵狸猫）的领导下，广阳以新中式建筑为核心，在北岛南岸建成了全服最美丽的天际线。',
				credit: null,
				gallery: [
					{
						asset: 'guangyangScreenshots1',
						alt: '北岸俯瞰图',
						caption: '北岸俯瞰图',
					},
					{
						asset: 'guangyangScreenshots2',
						alt: '南岸俯瞰图',
						caption: '南岸俯瞰图',
					},
				],
			},
			'zh-TW': {
				name: '這裡是\n廣陽\n都市圈',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '這裡是',
					name: '廣陽\n都市圈',
				},
				title: '全服規模最大的都市圈。',
				description:
					'廣陽的已建成面積幾乎佔據整個北島，是全服最大的都市圈。在 qixuanjun233（七炫）、Dotkk、xxlm233（宵宵狸貓）的帶領下，廣陽以新中式建築為核心，在北島南岸建成全服最美麗的天際線。',
				credit: null,
				gallery: [
					{
						asset: 'guangyangScreenshots1',
						alt: '北岸俯瞰圖',
						caption: '北岸俯瞰圖',
					},
					{
						asset: 'guangyangScreenshots2',
						alt: '南岸俯瞰圖',
						caption: '南岸俯瞰圖',
					},
				],
			},
			'en-US': {
				name: 'GUANGYANG\nMETROPOLITAN',
				title: 'The server’s largest metropolitan area.',
				description:
					'Guangyang’s built-up area spans nearly all of North Island, making it the largest metropolitan area on the server. Led by qixuanjun233, Dotkk, and xxlm233, Guangyang has shaped the North Island’s southern coast into the server’s most beautiful skyline through New Chinese architecture.',
				credit: null,
				gallery: [
					{
						asset: 'guangyangScreenshots1',
						alt: 'North shore aerial view',
						caption: 'North shore aerial view',
					},
					{
						asset: 'guangyangScreenshots2',
						alt: 'South shore aerial view',
						caption: 'South shore aerial view',
					},
				],
			},
			'ja-JP': {
				name: '広陽\n都市圏',
				title: 'サーバー最大規模の都市圏。',
				description:
					'広陽の市街地は北島のほぼ全域を占める、サーバー最大の都市圏です。qixuanjun233（七炫）、Dotkk、xxlm233（宵宵狸猫）の主導のもと、新中式建築を核として北島南岸にサーバー随一の美しいスカイラインを築き上げました。',
				credit: null,
				gallery: [
					{
						asset: 'guangyangScreenshots1',
						alt: '北岸俯瞰図',
						caption: '北岸俯瞰図',
					},
					{
						asset: 'guangyangScreenshots2',
						alt: '南岸俯瞰図',
						caption: '南岸俯瞰図',
					},
				],
			},
		},
	},
}
