import type {
	FriendLinkCategory,
	PartnerKind,
	PartnerSection,
	UserGender,
	UserProfileLanguage,
	UserRole,
} from '../../generated/prisma/client'

export interface ProductionOwnerConfig {
	handle: string
	username: string
	hydrolineId: string
	displayName: string
	role: UserRole
	joinedAt: Date
	createdAt: Date
	bio: string | null
	location: string | null
	countryOrRegion: string | null
	gender: UserGender
	verified: boolean
	verifiedTextZhCn: string | null
	verifiedTextZhTw: string | null
	verifiedTextEnUs: string | null
	verifiedTextJaJp: string | null
	profile: {
		h2wikiPageName: string | null
		githubUsername: string | null
		websiteUrl: string | null
		bilibiliUrl: string | null
		qqNumber: string | null
		wechatId: string | null
		publicEmail: string | null
	}
	preferences: {
		language: UserProfileLanguage
		timezoneMode: 'AUTO' | 'MANUAL'
		timezone: string | null
	}
	privacy: {
		publicProfile: boolean
		showHydrolineId: boolean
		showJoinedAt: boolean
		showLocation: boolean
		showCountryOrRegion: boolean
		showBirthday: boolean
		showBadges: boolean
		showBio: boolean
		showMinecraftProfileLink: boolean
		showSocialLinks: boolean
		showActivityStatus: boolean
		searchableInUserDirectory: boolean
		allowMinecraftProfileDiscovery: boolean
	}
	email: string
	password: string
}

export interface ProductionFriendLinkConfig {
	name: string
	category: FriendLinkCategory
	url: string
	summary: string | null
	enabled: boolean
	archived: boolean
	sortOrder: number
}

export interface ProductionPartnerConfig {
	name: string
	section: PartnerSection
	kind: PartnerKind | null
	summary: string | null
	websiteUrl: string | null
	enabled: boolean
	archived: boolean
	relationshipEstablishedAt: Date | null
	sortOrder: number
}

export interface ProductionInitConfig {
	owner: ProductionOwnerConfig
	friendLinks: ProductionFriendLinkConfig[]
	partners: ProductionPartnerConfig[]
}

export const productionInitConfig: ProductionInitConfig = {
	owner: {
		handle: 'aurlemon',
		username: 'AurLemon',
		hydrolineId: 'H-2601280B23HS',
		displayName: 'AurLemon',
		role: 'OWNER',
		joinedAt: new Date('2028-09-07T00:00:00.000Z'),
		createdAt: new Date(),
		bio: 'HydCraft 社区的建筑与红石爱好者，热爱红石与建筑设计，喜欢在服务器上与大家一起创造有趣的故事。',
		location: '上海，中国',
		countryOrRegion: '中国内地',
		gender: 'UNSPECIFIED',
		verified: true,
		verifiedTextZhCn: '氢气工艺服务器服主、管委会主席',
		verifiedTextZhTw: '氫氣工藝伺服器服主、管委會主席',
		verifiedTextEnUs:
			'Owner of HydCraft Server, Chair of the Management Committee',
		verifiedTextJaJp: 'HydCraft サーバーオーナー・管理委員会委員長',
		profile: {
			h2wikiPageName: 'Player:柠檬',
			githubUsername: 'AurLemon',
			websiteUrl: 'https://aurlemon.top/',
			bilibiliUrl: null,
			qqNumber: null,
			wechatId: null,
			publicEmail: null,
		},
		preferences: {
			language: 'ZH_CN',
			timezoneMode: 'AUTO',
			timezone: 'Asia/Shanghai',
		},
		privacy: {
			publicProfile: true,
			showHydrolineId: true,
			showJoinedAt: true,
			showLocation: true,
			showCountryOrRegion: true,
			showBirthday: false,
			showBadges: true,
			showBio: true,
			showMinecraftProfileLink: true,
			showSocialLinks: true,
			showActivityStatus: true,
			searchableInUserDirectory: true,
			allowMinecraftProfileDiscovery: true,
		},
		email: 'example@hydcraft.cn',
		password: 'portaladmin',
	},
	friendLinks: [
		{
			name: 'HydCraft Wiki',
			category: 'BUSINESS',
			url: 'https://wiki.hydcraft.cn',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 0,
		},
		{
			name: 'HydCraft Docs',
			category: 'BUSINESS',
			url: 'https://docs.hydcraft.cn',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 1,
		},
		{
			name: 'AurLemon Intro',
			category: 'PERSONAL',
			url: 'https://aurlemon.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 0,
		},
		{
			name: 'Larker',
			category: 'PERSONAL',
			url: 'https://www.bg7qvu.cn/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 1,
		},
		{
			name: 'Frost-ZX',
			category: 'PERSONAL',
			url: 'https://blog.frost-zx.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 2,
		},
		{
			name: '上小官的个人学习网站',
			category: 'PERSONAL',
			url: 'https://shangxiaoguan.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 3,
		},
		{
			name: 'Fetarute Wiki',
			category: 'ORGANIZATION',
			url: 'https://www.fetarute.org/wiki/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 0,
		},
		{
			name: 'Fetarute',
			category: 'ORGANIZATION',
			url: 'https://hp.fetarute.org/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 1,
		},
		{
			name: 'ChihoCraft Wiki',
			category: 'ORGANIZATION',
			url: 'https://wiki.chihocraft.com/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 2,
		},
		{
			name: 'NebulaeWiki',
			category: 'ORGANIZATION',
			url: 'https://wiki.knebulae.com/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 3,
		},
		{
			name: 'SakuraWiki',
			category: 'ORGANIZATION',
			url: 'https://wiki.sakraft.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 4,
		},
		{
			name: 'YouterWiki',
			category: 'ORGANIZATION',
			url: 'https://wiki.youter.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 5,
		},
		{
			name: '临东市服务器Wiki',
			category: 'ORGANIZATION',
			url: 'https://wiki.shangxiaoguan.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 6,
		},
		{
			name: '星海市轨道交通建设',
			category: 'ORGANIZATION',
			url: 'https://www.xhcity.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 7,
		},
		{
			name: 'Wheat Forum',
			category: 'ORGANIZATION',
			url: 'https://forum.wheat-server.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 8,
		},
		{
			name: 'TangibleCraft',
			category: 'ORGANIZATION',
			url: 'https://tangible.xiaotang27.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 9,
		},
		{
			name: '梦の乡 DreamSide',
			category: 'ORGANIZATION',
			url: 'https://dreamside.cn:233/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 10,
		},
		{
			name: 'HokubuCraft',
			category: 'ORGANIZATION',
			url: 'https://www.hokubucraft.cn/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 11,
		},
		{
			name: 'HokubuBBS',
			category: 'ORGANIZATION',
			url: 'https://www.hokubu.cn/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 12,
		},
		{
			name: 'MTRBBS',
			category: 'ORGANIZATION',
			url: 'https://www.mtrbbs.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 13,
		},
		{
			name: '氧气社区',
			category: 'ORGANIZATION',
			url: 'https://bbs.oxygenstudio.cn/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 14,
		},
		{
			name: 'ColaCraft Wiki',
			category: 'ORGANIZATION',
			url: 'http://wiki.panax11.cn/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 15,
		},
		{
			name: 'HarmonyCraft Wiki',
			category: 'ORGANIZATION',
			url: 'https://harmonycraft.fandom.com/zh/HarmonyCraft_Wiki/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 16,
		},
		{
			name: 'Dollan Infinity TH Wiki',
			category: 'ORGANIZATION',
			url: 'https://wiki.dollancraft.top/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 17,
		},
		{
			name: 'ShanhaiiCraft Wiki',
			category: 'ORGANIZATION',
			url: 'https://shanhaiicraft.fandom.com/zh/wiki/ShanhaiiCraft_Wiki/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 18,
		},
		{
			name: 'WALLĒR（清云）组织',
			category: 'ORGANIZATION',
			url: 'https://siteid-2203912.univer.se/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 19,
		},
		{
			name: '浦坂 · Urasaka',
			category: 'ORGANIZATION',
			url: 'https://urasaka.miraheze.org/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 20,
		},
		{
			name: 'EaseCation Wiki',
			category: 'ORGANIZATION',
			url: 'http://wiki.easecation.net/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 21,
		},
		{
			name: '徽江工艺官网',
			category: 'ORGANIZATION',
			url: 'https://huichiangcraft.mysxl.cn/',
			summary: null,
			enabled: true,
			archived: false,
			sortOrder: 22,
		},
	],
	partners: [
		{
			name: 'Fetarute',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 0,
		},
		{
			name: '临东市服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 1,
		},
		{
			name: '北武工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 2,
		},
		{
			name: '翊秋工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 3,
		},
		{
			name: 'Cloudsdale',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 4,
		},
		{
			name: '星海市服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 5,
		},
		{
			name: '堂瞰工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 6,
		},
		{
			name: '西武工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 7,
		},
		{
			name: '申海工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 8,
		},
		{
			name: '东安工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 9,
		},
		{
			name: '瀚海工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 10,
		},
		{
			name: '花梦工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 11,
		},
		{
			name: '可乐工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 12,
		},
		{
			name: '麦子茶会服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 13,
		},
		{
			name: '樱花工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 14,
		},
		{
			name: 'HOC Network',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: true,
			relationshipEstablishedAt: null,
			sortOrder: 15,
		},
		{
			name: 'Youter',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: true,
			relationshipEstablishedAt: null,
			sortOrder: 16,
		},
		{
			name: '苯环工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: true,
			relationshipEstablishedAt: null,
			sortOrder: 17,
		},
		{
			name: '坪岗服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: true,
			relationshipEstablishedAt: null,
			sortOrder: 18,
		},
		{
			name: '千穗工艺服务器',
			section: 'COMMUNITY',
			kind: 'SERVER',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: true,
			relationshipEstablishedAt: null,
			sortOrder: 19,
		},
		{
			name: '氧气团队',
			section: 'COMMUNITY',
			kind: 'ORGANIZATION',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 20,
		},
		{
			name: 'WALLĒR（清云）组织',
			section: 'COMMUNITY',
			kind: 'ORGANIZATION',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 21,
		},
		{
			name: '桃林组织',
			section: 'COMMUNITY',
			kind: 'ORGANIZATION',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 22,
		},
		{
			name: '中国MC交通服务器联盟',
			section: 'COMMUNITY',
			kind: 'ORGANIZATION',
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 23,
		},
		{
			name: 'Frost-ZX',
			section: 'SUPPORT_ACKNOWLEDGEMENTS',
			kind: null,
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 24,
		},
		{
			name: 'Xenonera',
			section: 'SUPPORT_ACKNOWLEDGEMENTS',
			kind: null,
			summary: null,
			websiteUrl: null,
			enabled: true,
			archived: false,
			relationshipEstablishedAt: null,
			sortOrder: 25,
		},
	],
}
