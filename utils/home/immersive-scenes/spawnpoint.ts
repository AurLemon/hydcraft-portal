import { getIntroStaffMember } from '~/utils/intro/staff-members'
import type { HomeImmersiveSceneDefinition } from './types'

const auroraLemon = getIntroStaffMember('Aurora_Lemon')
const xiaoAwa = getIntroStaffMember('Xiao_awa_')
const ninaNaganohara = getIntroStaffMember('Nina_Naganohara')

if (!auroraLemon || !xiaoAwa || !ninaNaganohara) {
	throw new Error('Missing shared Spawnpoint team profile')
}

export const spawnpointScene: HomeImmersiveSceneDefinition = {
	id: 'spawnpoint',
	shortName: {
		'zh-CN': '出生点',
		'zh-TW': '出生點',
		'en-US': 'Spawnpoint',
		'ja-JP': 'スポーンポイント',
	},
	mapAssetsBaseUrl: 'https://map.oxygen.hydcraft.cn/maps/world',
	mapAssetsFallbackBaseUrls: ['https://map-assets.hydcraft.cn/oxygen/world'],
	camera: {
		x: 1026.39,
		y: 63,
		z: 5552.39,
		distance: 967.39,
		rotation: -2.3291,
		angle: 0.8676,
		tilt: 0,
	},
	lighting: {
		sourceXPercent: 57,
		sourceYPercent: 16,
		directionAngle: -0.35,
		coneSpread: 0.32,
		desktopConeWidth: 0.23,
		mobileConeWidth: 0.18,
		scanXAmplitude: 0.08,
		scanPeriodSeconds: 29,
	},
	players: [
		{
			id: auroraLemon.id,
			serverId: 'hydcraft-oxygen',
			nickname: auroraLemon.nickname,
			bio: auroraLemon.bio,
			portalUsername: auroraLemon.portalUsername,
			focusOrder: 0,
		},
		{
			id: xiaoAwa.id,
			serverId: 'hydcraft-oxygen',
			nickname: xiaoAwa.nickname,
			bio: xiaoAwa.bio,
			portalUsername: xiaoAwa.portalUsername,
			focusOrder: 1,
		},
		{
			id: ninaNaganohara.id,
			serverId: 'hydcraft-oxygen',
			nickname: ninaNaganohara.nickname,
			bio: ninaNaganohara.bio,
			portalUsername: ninaNaganohara.portalUsername,
			focusOrder: 2,
		},
	],
	presentation: {
		skinUsername: auroraLemon.id,
		credit: {
			role: 'builder',
			icon: 'i-simple-icons-xiaohongshu',
		},
		locales: {
			'zh-CN': {
				name: '这里是\n出生点',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '这里是',
					name: '出生点',
				},
				title: '服务器的原点、管委会的大本营。',
				description:
					'一直以来，服务器都会给出生点（暂定名）划分一个区域作为管委会的大本营。出生点全岛都被划为了管委会直管区，许多玩家给出生点贡献了许多建筑。目前出生点直管区主要由 Aurora_Lemon（柠檬）等管委会成员和部分元老院成员负责。',
				credit: null,
				gallery: [
					{
						asset: 'spawnpointScreenshots1',
						alt: '雨中的出生点码头',
						caption: '雨中的出生点码头',
					},
				],
			},
			'zh-TW': {
				name: '這裡是\n出生點',
				desktopDisplayName: {
					layout: 'horizontal',
					prefix: '這裡是',
					name: '出生點',
				},
				title: '伺服器的原點、管委會的大本營。',
				description:
					'一直以來，伺服器都會為出生點（暫定名）劃出一個區域作為管委會的大本營。出生點全島皆劃為管委會直管區，許多玩家也為此貢獻了建築。目前出生點直管區主要由 Aurora_Lemon（檸檬）等管委會成員與部分元老院成員負責。',
				credit: null,
				gallery: [
					{
						asset: 'spawnpointScreenshots1',
						alt: '雨中的出生點碼頭',
						caption: '雨中的出生點碼頭',
					},
				],
			},
			'en-US': {
				name: 'SPAWNPOINT',
				title: 'The server’s centre and the committee’s headquarters.',
				description:
					'The server has always designated an area around Spawnpoint as the committee’s headquarters. The entire island is directly administered by the committee, and many players have contributed buildings to it. Today, the Spawnpoint district is primarily maintained by committee members including Aurora_Lemon, together with members of the Council of Elders.',
				credit: null,
				gallery: [
					{
						asset: 'spawnpointScreenshots1',
						alt: 'Spawnpoint pier in the rain',
						caption: 'Spawnpoint pier in the rain',
					},
				],
			},
			'ja-JP': {
				name: 'スポーンポイント',
				title: 'サーバーの中心、そして管委会の本拠地。',
				description:
					'これまでサーバーでは、スポーンポイント（仮称）の一角を管委会の本拠地として定めてきました。島全体は管委会の直轄区であり、多くのプレイヤーが建築を寄せています。現在は Aurora_Lemonをはじめとする管委会メンバーと、一部の元老院メンバーが主に担当しています。',
				credit: null,
				gallery: [
					{
						asset: 'spawnpointScreenshots1',
						alt: '雨のスポーンポイント埠頭',
						caption: '雨のスポーンポイント埠頭',
					},
				],
			},
		},
	},
}
