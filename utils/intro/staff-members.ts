export type IntroStaffBadgeKey =
	| 'member'
	| 'advisor'
	| 'viceOwner'
	| 'councilOfEldersSecretary'

export interface IntroStaffMemberIdentity {
	id: string
	nickname: string
}

export interface IntroCommitteeMemberDefinition extends IntroStaffMemberIdentity {
	badges: IntroStaffBadgeKey[]
}

export const introOwnerMember: IntroStaffMemberIdentity = {
	id: 'Aurora_Lemon',
	nickname: '柠檬',
}

export const introCommitteeMemberDefinitions: IntroCommitteeMemberDefinition[] =
	[
		{
			id: 'Xiao_awa_',
			nickname: '肖阿瓦',
			badges: ['member', 'councilOfEldersSecretary'],
		},
		{
			id: 'Complex_Colors',
			nickname: '杂色',
			badges: ['member'],
		},
		{
			id: 'CatPillager',
			nickname: '仓鼠',
			badges: ['member', 'viceOwner'],
		},
		{
			id: 'qixuanjun233',
			nickname: '七炫',
			badges: ['member', 'viceOwner'],
		},
		{
			id: 'larker_package',
			nickname: '拉克',
			badges: ['member', 'viceOwner'],
		},
		{
			id: 'FisheyeArtist59',
			nickname: '题散',
			badges: ['advisor'],
		},
	]

export const introCouncilOfEldersMemberDefinitions: IntroStaffMemberIdentity[] =
	[
		{ id: 'xwTeng', nickname: '小万' },
		{ id: 'Nina_Naganohara', nickname: 'afe' },
		{ id: 'xxlm233', nickname: '宵宵狸猫' },
		{ id: 'CN_DaJiChi', nickname: '鸡翅' },
		{ id: 'Chuxia_SF', nickname: '初夏' },
		{ id: 'Dotkk', nickname: 'Dotkk' },
		{ id: 'ColaFrog', nickname: '可蛙' },
		{ id: 'QiShui233', nickname: '汽水' },
		{ id: 'TochoShizuku', nickname: '远绪' },
		{ id: 'LanYue_CN', nickname: '蓝月' },
		{ id: 'Mobike', nickname: '摩拜' },
		{ id: 'Hei_awa_', nickname: '小黑' },
		{ id: 'BackSpace', nickname: '退格' },
		{ id: 'MainCity_Subway', nickname: '主城' },
		{ id: 'UYxiaoli', nickname: '小李' },
		{ id: 'misaka_12448', nickname: 'misaka' },
		{ id: 'Yasten58', nickname: '企鹅' },
		{ id: 'Mo_Dren', nickname: '万禺' },
		{ id: 'LuRenDing', nickname: '路人丁' },
		{ id: 'Niuboss123', nickname: '牛老板' },
		{ id: 'J14157', nickname: 'J14157' },
		{ id: 'Aerocraft_Filoya', nickname: '飞行器' },
		{ id: 'Dongfeng_SD', nickname: '东风小姐姐' },
		{ id: 'KuangSY_5716', nickname: 'Kwong' },
		{ id: 'Umi_Sonodaaa', nickname: 'Umi' },
		{ id: 'Misaka_13577', nickname: '弥撒卡' },
		{ id: 'FruKyuu', nickname: '芙秋' },
		{ id: 'LynaCrystal', nickname: '乾喵' },
		{ id: 'xiaobaimao233', nickname: '小白猫' },
	]

const introStaffMemberMap = new Map<string, IntroStaffMemberIdentity>([
	[introOwnerMember.id, introOwnerMember],
	...introCommitteeMemberDefinitions.map(
		(member) => [member.id, member] as const,
	),
	...introCouncilOfEldersMemberDefinitions.map(
		(member) => [member.id, member] as const,
	),
])

export const getIntroStaffMemberIdentity = (
	memberId: string,
): IntroStaffMemberIdentity => {
	return (
		introStaffMemberMap.get(memberId) ?? {
			id: memberId,
			nickname: memberId,
		}
	)
}
