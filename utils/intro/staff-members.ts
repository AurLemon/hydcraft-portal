export type IntroStaffBadgeKey =
	| 'member'
	| 'advisor'
	| 'viceOwner'
	| 'councilOfEldersSecretary'

export type IntroStaffLocalizedText = Readonly<
	Record<'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP', string>
>

export interface IntroStaffMemberIdentity {
	id: string
	nickname: string
	bio: IntroStaffLocalizedText
}

export interface IntroCommitteeMemberDefinition extends IntroStaffMemberIdentity {
	badges: IntroStaffBadgeKey[]
}

const sharedBios = {
	owner: {
		'zh-CN': '持续维护服务器、网站与社区方向。',
		'zh-TW': '持續維護伺服器、網站與社群方向。',
		'en-US': 'Keeps the server, website, and community direction moving.',
		'ja-JP': 'サーバー、ウェブサイト、コミュニティの方向性を維持しています。',
	},
	committee: {
		'zh-CN': '参与服务器事务协调与社区维护。',
		'zh-TW': '參與伺服器事務協調與社群維護。',
		'en-US': 'Helps coordinate server affairs and maintain the community.',
		'ja-JP': 'サーバー運営の調整とコミュニティの維持に携わっています。',
	},
	councilOfElders: {
		'zh-CN': '以长期参与留下经验、作品与共同记忆。',
		'zh-TW': '以長期參與留下經驗、作品與共同記憶。',
		'en-US': 'Brings long-term experience, creations, and shared memories.',
		'ja-JP': '長年の経験、作品、そして共有された記憶を残しています。',
	},
} satisfies Record<string, IntroStaffLocalizedText>

const createStaffMember = <TMember extends { id: string; nickname: string }>(
	member: TMember,
	bio: IntroStaffLocalizedText,
): TMember & Pick<IntroStaffMemberIdentity, 'bio'> => ({
	...member,
	bio,
})

export const introOwnerMember: IntroStaffMemberIdentity = createStaffMember(
	{
		id: 'Aurora_Lemon',
		nickname: '柠檬',
	},
	sharedBios.owner,
)

export const introCommitteeMemberDefinitions: IntroCommitteeMemberDefinition[] =
	[
		createStaffMember(
			{
				id: 'Xiao_awa_',
				nickname: '肖阿瓦',
				badges: ['member', 'councilOfEldersSecretary'],
			},
			sharedBios.committee,
		),
		createStaffMember(
			{ id: 'Complex_Colors', nickname: '杂色', badges: ['member'] },
			sharedBios.committee,
		),
		createStaffMember(
			{
				id: 'CatPillager',
				nickname: '仓鼠',
				badges: ['member', 'viceOwner'],
			},
			{
				'zh-CN':
					'广东深圳人，七周目、八周目地图设计者。擅长地图绘制、小比例设计与机械动力装置，也能够很好地驾驭欧美风格建筑。',
				'zh-TW':
					'廣東深圳人，七週目、八週目地圖設計者。擅長地圖繪製、小比例設計與機械動力裝置，也能很好地駕馭歐美風格建築。',
				'en-US':
					'A Shenzhen-based map designer for Seasons 7 and 8, known for compact urban design, kinetic machinery, and Western architecture.',
				'ja-JP':
					'深圳出身の第7・第8シーズンのマップデザイナー。小規模都市設計、動力機械、欧米風建築を得意としています。',
			},
		),
		createStaffMember(
			{
				id: 'qixuanjun233',
				nickname: '七炫',
				badges: ['member', 'viceOwner'],
			},
			sharedBios.committee,
		),
		createStaffMember(
			{
				id: 'larker_package',
				nickname: '拉克',
				badges: ['member', 'viceOwner'],
			},
			sharedBios.committee,
		),
		createStaffMember(
			{ id: 'FisheyeArtist59', nickname: '题散', badges: ['advisor'] },
			sharedBios.committee,
		),
	]

const introCouncilOfEldersMembers = [
	['xwTeng', '小万'],
	['Nina_Naganohara', 'afe'],
	['xxlm233', '宵宵狸猫'],
	['CN_DaJiChi', '鸡翅'],
	['Chuxia_SF', '初夏'],
	['Dotkk', 'Dotkk'],
	['ColaFrog', '可蛙'],
	['QiShui233', '汽水'],
	['TochoShizuku', '远绪'],
	['LanYue_CN', '蓝月'],
	['Mobike', '摩拜'],
	['Hei_awa_', '小黑'],
	['BackSpace', '退格'],
	['MainCity_Subway', '主城'],
	['UYxiaoli', '小李'],
	['misaka_12448', 'misaka'],
	['Yasten58', '企鹅'],
	['Mo_Dren', '万禺'],
	['LuRenDing', '路人丁'],
	['Niuboss123', '牛老板'],
	['J14157', 'J14157'],
	['Aerocraft_Filoya', '飞行器'],
	['Dongfeng_SD', '东风小姐姐'],
	['KuangSY_5716', 'Kwong'],
	['Umi_Sonodaaa', 'Umi'],
	['Misaka_13577', '弥撒卡'],
	['FruKyuu', '芙秋'],
	['LynaCrystal', '乾喵'],
	['xiaobaimao233', '小白猫'],
] as const

export const introCouncilOfEldersMemberDefinitions: IntroStaffMemberIdentity[] =
	introCouncilOfEldersMembers.map(([id, nickname]) =>
		createStaffMember({ id, nickname }, sharedBios.councilOfElders),
	)

/**
 * Homepage scene collaborators are intentionally separate from the Intro
 * owner, committee, and council lists. They may not have Portal accounts.
 */
export const introSceneContributorDefinitions: IntroStaffMemberIdentity[] = [
	createStaffMember(
		{ id: 'RUSH132', nickname: 'RUSH' },
		{
			'zh-CN': '卡温群岛团队成员，个人档案待后续补充。',
			'zh-TW': '卡溫群島團隊成員，個人檔案待後續補充。',
			'en-US': 'A Calwyn Archipelago team member. Profile details are pending.',
			'ja-JP': 'カルウィン諸島チームのメンバー。プロフィール詳細は準備中です。',
		},
	),
	createStaffMember(
		{ id: 'Kezzyblue', nickname: 'Kevin' },
		{
			'zh-CN': '卡温群岛团队成员，个人档案待后续补充。',
			'zh-TW': '卡溫群島團隊成員，個人檔案待後續補充。',
			'en-US': 'A Calwyn Archipelago team member. Profile details are pending.',
			'ja-JP': 'カルウィン諸島チームのメンバー。プロフィール詳細は準備中です。',
		},
	),
]

const introStaffMemberMap = new Map<string, IntroStaffMemberIdentity>([
	[introOwnerMember.id, introOwnerMember],
	...introCommitteeMemberDefinitions.map(
		(member) => [member.id, member] as const,
	),
	...introCouncilOfEldersMemberDefinitions.map(
		(member) => [member.id, member] as const,
	),
	...introSceneContributorDefinitions.map(
		(member) => [member.id, member] as const,
	),
])

export const getIntroStaffMemberIdentity = (
	memberId: string,
): Pick<IntroStaffMemberIdentity, 'id' | 'nickname'> => {
	return (
		introStaffMemberMap.get(memberId) ?? {
			id: memberId,
			nickname: memberId,
		}
	)
}

export const getIntroStaffMember = (
	memberId: string,
): IntroStaffMemberIdentity | undefined => introStaffMemberMap.get(memberId)
