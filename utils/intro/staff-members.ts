import { introStaffBios } from './staff-bios'

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
	bio: IntroStaffLocalizedText | null
	portalUsername?: string
}

export interface IntroCommitteeMemberDefinition extends IntroStaffMemberIdentity {
	badges: IntroStaffBadgeKey[]
}

interface IntroCommitteeMembershipDefinition {
	id: string
	badges: readonly IntroStaffBadgeKey[]
}

const createStaffMember = <TMember extends { id: string; nickname: string }>(
	member: TMember,
	bio: IntroStaffLocalizedText | null,
): TMember & Pick<IntroStaffMemberIdentity, 'bio'> => ({
	...member,
	bio,
})

/**
 * Canonical personal profiles. Organization membership is defined below so a
 * person who belongs to multiple groups still has one nickname and bio.
 */
const introStaffProfileDefinitions: IntroStaffMemberIdentity[] = [
	createStaffMember(
		{
			id: 'Aurora_Lemon',
			nickname: '柠檬',
			portalUsername: 'AurLemon',
		},
		introStaffBios.Aurora_Lemon,
	),
	createStaffMember(
		{
			id: 'Xiao_awa_',
			nickname: '肖阿瓦',
			portalUsername: 'Xiao_awa_',
		},
		introStaffBios.Xiao_awa_,
	),
	createStaffMember(
		{
			id: 'Complex_Colors',
			nickname: '杂色',
			portalUsername: 'Zoushiki',
		},
		introStaffBios.Complex_Colors,
	),
	createStaffMember(
		{
			id: 'CatPillager',
			nickname: '仓鼠',
			portalUsername: 'CatPillager',
		},
		introStaffBios.CatPillager,
	),
	createStaffMember(
		{
			id: 'qixuanjun233',
			nickname: '七炫',
			portalUsername: 'qixuanjun233',
		},
		introStaffBios.qixuanjun233,
	),
	createStaffMember(
		{
			id: 'larker_package',
			nickname: '拉克',
			portalUsername: 'larker_package',
		},
		introStaffBios.larker_package,
	),
	createStaffMember(
		{
			id: 'FisheyeArtist59',
			nickname: '题散',
			portalUsername: 'JrZhang',
		},
		introStaffBios.FisheyeArtist59,
	),
	createStaffMember(
		{
			id: 'xwTeng',
			nickname: '小万',
			portalUsername: 'xwTeng',
		},
		introStaffBios.xwTeng,
	),
	createStaffMember(
		{
			id: 'Nina_Naganohara',
			nickname: 'afe',
			portalUsername: 'NinaNaganohara',
		},
		introStaffBios.Nina_Naganohara,
	),
	createStaffMember(
		{
			id: 'xxlm233',
			nickname: '宵宵狸猫',
			portalUsername: 'xxlm233',
		},
		introStaffBios.xxlm233,
	),
	createStaffMember({ id: 'CN_DaJiChi', nickname: '鸡翅' }, null),
	createStaffMember(
		{
			id: 'Chuxia_SF',
			nickname: '初夏',
			portalUsername: 'Chuxia_SF',
		},
		introStaffBios.Chuxia_SF,
	),
	createStaffMember(
		{
			id: 'Dotkk',
			nickname: 'Dotkk',
			portalUsername: 'Dotkk',
		},
		introStaffBios.Dotkk,
	),
	createStaffMember(
		{
			id: 'ColaFrog',
			nickname: '可蛙',
			portalUsername: 'ColaFrog',
		},
		introStaffBios.ColaFrog,
	),
	createStaffMember(
		{
			id: 'QiShui233',
			nickname: '汽水',
			portalUsername: 'PanL',
		},
		introStaffBios.QiShui233,
	),
	createStaffMember(
		{
			id: 'TochoShizuku',
			nickname: '远绪',
			portalUsername: 'TochoShizuku',
		},
		introStaffBios.TochoShizuku,
	),
	createStaffMember({ id: 'LanYue_CN', nickname: '蓝月' }, null),
	createStaffMember({ id: 'Mobike', nickname: '摩拜' }, null),
	createStaffMember({ id: 'Hei_awa_', nickname: '小黑' }, null),
	createStaffMember({ id: 'BackSpace', nickname: '退格' }, null),
	createStaffMember({ id: 'MainCity_Subway', nickname: '主城' }, null),
	createStaffMember({ id: 'UYxiaoli', nickname: '小李' }, null),
	createStaffMember({ id: 'misaka_12448', nickname: 'misaka' }, null),
	createStaffMember({ id: 'Yasten58', nickname: '企鹅' }, null),
	createStaffMember({ id: 'Mo_Dren', nickname: '万禺' }, null),
	createStaffMember({ id: 'LuRenDing', nickname: '路人丁' }, null),
	createStaffMember({ id: 'Niuboss123', nickname: '牛老板' }, null),
	createStaffMember({ id: 'J14157', nickname: 'J14157' }, null),
	createStaffMember({ id: 'Aerocraft_Filoya', nickname: '飞行器' }, null),
	createStaffMember({ id: 'Dongfeng_SD', nickname: '东风小姐姐' }, null),
	createStaffMember({ id: 'KuangSY_5716', nickname: 'Kwong' }, null),
	createStaffMember({ id: 'Umi_Sonodaaa', nickname: 'Umi' }, null),
	createStaffMember({ id: 'Misaka_13577', nickname: '弥撒卡' }, null),
	createStaffMember({ id: 'FruKyuu', nickname: '芙秋' }, null),
	createStaffMember({ id: 'LynaCrystal', nickname: '乾喵' }, null),
	createStaffMember({ id: 'xiaobaimao233', nickname: '小白猫' }, null),
	createStaffMember(
		{ id: 'RUSH132', nickname: 'RUSH' },
		introStaffBios.RUSH132,
	),
	createStaffMember(
		{ id: 'Kezzyblue', nickname: 'Kevin' },
		introStaffBios.Kezzyblue,
	),
	createStaffMember({ id: 'Mr_Z0406', nickname: '冰可乐' }, null),
]

const introStaffMemberMap = new Map(
	introStaffProfileDefinitions.map((member) => [member.id, member] as const),
)

const requireIntroStaffMember = (
	memberId: string,
): IntroStaffMemberIdentity => {
	const member = introStaffMemberMap.get(memberId)
	if (!member) {
		throw new Error(`Missing intro staff profile: ${memberId}`)
	}
	return member
}

export const introOwnerMember = requireIntroStaffMember('Aurora_Lemon')

const introCommitteeMembershipDefinitions = [
	{ id: 'Xiao_awa_', badges: ['member', 'councilOfEldersSecretary'] },
	{ id: 'Complex_Colors', badges: ['member'] },
	{ id: 'CatPillager', badges: ['member', 'viceOwner'] },
	{ id: 'qixuanjun233', badges: ['member', 'viceOwner'] },
	{ id: 'larker_package', badges: ['member', 'viceOwner'] },
	{ id: 'FisheyeArtist59', badges: ['advisor'] },
] as const satisfies readonly IntroCommitteeMembershipDefinition[]

export const introCommitteeMemberDefinitions: IntroCommitteeMemberDefinition[] =
	introCommitteeMembershipDefinitions.map(({ id, badges }) => ({
		...requireIntroStaffMember(id),
		badges: [...badges],
	}))

const introCouncilOfEldersMemberIds = [
	'xwTeng',
	'Nina_Naganohara',
	'xxlm233',
	'CN_DaJiChi',
	'Chuxia_SF',
	'Dotkk',
	'ColaFrog',
	'QiShui233',
	'TochoShizuku',
	'LanYue_CN',
	'Mobike',
	'Hei_awa_',
	'BackSpace',
	'MainCity_Subway',
	'UYxiaoli',
	'misaka_12448',
	'Yasten58',
	'Mo_Dren',
	'LuRenDing',
	'Niuboss123',
	'J14157',
	'Aerocraft_Filoya',
	'Dongfeng_SD',
	'KuangSY_5716',
	'Umi_Sonodaaa',
	'Misaka_13577',
	'FruKyuu',
	'LynaCrystal',
	'xiaobaimao233',
	'RUSH132',
	'Kezzyblue',
	'Mr_Z0406',
] as const

export const introCouncilOfEldersMemberDefinitions: IntroStaffMemberIdentity[] =
	introCouncilOfEldersMemberIds.map(requireIntroStaffMember)

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
