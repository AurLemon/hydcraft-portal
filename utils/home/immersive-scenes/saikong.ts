import { getIntroStaffMember } from '~/utils/intro/staff-members'
import type { HomeImmersiveSceneDefinition } from './types'

const fisheyeArtist59 = getIntroStaffMember('FisheyeArtist59')

if (!fisheyeArtist59) {
	throw new Error('Missing shared Saikong team profile')
}

export const saikongScene: HomeImmersiveSceneDefinition = {
	id: 'saikong',
	shortName: {
		'zh-CN': '西港',
		'zh-TW': '西港',
		'en-US': 'Saikong',
		'ja-JP': '西港城区',
	},
	mapAssetsBaseUrl: 'https://map-assets.hydcraft.cn/oxygen/world',
	camera: {
		x: -957.12,
		y: 63,
		z: 8364.71,
		distance: 2346.68,
		rotation: 2.5481,
		angle: 0.5323,
		tilt: 0,
	},
	lighting: {
		sourceXPercent: 62,
		sourceYPercent: 14,
		directionAngle: 0.55,
		coneSpread: 0.31,
		desktopConeWidth: 0.22,
		mobileConeWidth: 0.18,
		scanXAmplitude: 0.1,
		scanPeriodSeconds: 25,
	},
	players: [
		{
			id: fisheyeArtist59.id,
			serverId: 'hydcraft-oxygen',
			nickname: fisheyeArtist59.nickname,
			bio: fisheyeArtist59.bio,
			portalUsername: fisheyeArtist59.portalUsername,
			focusOrder: 0,
		},
	],
	presentation: {
		skinUsername: fisheyeArtist59.id,
		credit: {
			role: 'builder',
			icon: 'i-simple-icons-xiaohongshu',
		},
		locales: {
			'zh-CN': {
				name: '这里是\n西港',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '这里是',
					name: '西港',
				},
				title: '全服机械动力最发达的区域。',
				description:
					'西港是通运和东仪电子在八周目所经营的新城市，由 FisheyeArtist59（题散）负责。除了必不可少的机械动力铁路、机械动力设施以外，八周目新引入的航空学为西港的发展注入了更多可能性。',
				credit: null,
				gallery: [
					{
						asset: 'saikongScreenshots1',
						alt: '西港北岸俯瞰图',
						caption: '西港北岸俯瞰图',
					},
				],
			},
			'zh-TW': {
				name: '這裡是\n西港',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '這裡是',
					name: '西港',
				},
				title: '全服機械動力最發達的區域。',
				description:
					'西港是通運和東儀電子在第八週目經營的新城市，由 FisheyeArtist59（題散）負責。除了不可或缺的機械動力鐵路與機械動力設施，第八週目新引入的航空學也為西港的發展注入更多可能性。',
				credit: null,
				gallery: [
					{
						asset: 'saikongScreenshots1',
						alt: '西港北岸俯瞰圖',
						caption: '西港北岸俯瞰圖',
					},
				],
			},
			'en-US': {
				name: 'SAIKONG',
				title: 'The server’s most advanced hub for Create machinery.',
				description:
					'Saikong is a new Season 8 city operated by Tongyun and Dongyi Electronics, led by FisheyeArtist59. Beyond its essential Create railways and infrastructure, the new aviation system introduced in Season 8 has opened even more possibilities for Saikong’s development.',
				credit: null,
				gallery: [
					{
						asset: 'saikongScreenshots1',
						alt: 'Saikong north shore aerial view',
						caption: 'Saikong north shore aerial view',
					},
				],
			},
			'ja-JP': {
				name: '西港城区',
				title: 'サーバーで最も機械動力が発達した地域。',
				description:
					'西港は通運と東儀電子が第八シーズンに運営する新都市で、FisheyeArtist59が担当しています。不可欠な機械動力鉄道や機械動力施設に加え、第八シーズンで新たに導入された航空学が、西港の発展にさらなる可能性をもたらしています。',
				credit: null,
				gallery: [
					{
						asset: 'saikongScreenshots1',
						alt: '西港北岸俯瞰図',
						caption: '西港北岸俯瞰図',
					},
				],
			},
		},
	},
}
