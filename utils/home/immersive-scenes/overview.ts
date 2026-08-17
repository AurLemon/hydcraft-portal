import {
	introCommitteeMemberDefinitions,
	introCouncilOfEldersMemberDefinitions,
	introOwnerMember,
	type IntroStaffMemberIdentity,
} from '~/utils/intro/staff-members'
import type {
	HomeImmersiveOverviewConfig,
	HomeImmersiveOverviewMember,
	HomeImmersiveOverviewMemberRole,
} from './types'

const OVERVIEW_SERVER_ID = 'hydcraft-oxygen'
const OVERVIEW_FALLBACK_SPAWN = { x: 4000, y: 63, z: 5409 } as const

const createOverviewMember = (
	member: IntroStaffMemberIdentity,
	roles: readonly HomeImmersiveOverviewMemberRole[],
): HomeImmersiveOverviewMember => ({
	...member,
	serverId: OVERVIEW_SERVER_ID,
	roles,
	bio: member.bio,
})

const committeeMemberIds = new Set(
	introCommitteeMemberDefinitions.map((member) => member.id),
)

export const homeImmersiveOverview: HomeImmersiveOverviewConfig = {
	map: {
		camera: {
			x: 4000,
			y: 63,
			z: 5409,
			distance: 22000,
			rotation: 0,
			angle: 0,
			tilt: 0,
		},
		mobileCamera: {
			x: 6500,
			y: 63,
			z: 5409,
			distance: 36000,
			rotation: 0,
			angle: 0,
			tilt: 0,
		},
		fallbackSpawn: OVERVIEW_FALLBACK_SPAWN,
	},
	stats: {
		foundedAt: '2018-09-01T00:00:00+08:00',
		timeZone: 'Asia/Shanghai',
		memberCount: 50,
	},
	members: [
		createOverviewMember(introOwnerMember, ['owner', 'committee']),
		...introCommitteeMemberDefinitions.map((member) =>
			createOverviewMember(member, ['committee']),
		),
		...introCouncilOfEldersMemberDefinitions.map((member) =>
			createOverviewMember(member, [
				'councilOfElders',
				...(committeeMemberIds.has(member.id) ? (['committee'] as const) : []),
			]),
		),
	],
}
