import type {
	MinecraftAccountForm,
	MinecraftLastLoginSummary,
	MinecraftRegistrationSummary,
} from '~/utils/minecraft/accounts'

export interface PlayerImmersiveSummaryItem {
	key: string
	label: string
	value: string
	icon: string
}

export interface PlayerImmersiveServerViewItem {
	label: string
	value: string
}

export interface PlayerImmersiveMobileAuthMeDetail {
	kind: 'lastLogin' | 'registration'
	title: string
	icon: string
	location: string
	ipAddress: string
	activityTime: string
	hasIpAddress: boolean
	ipVisible: boolean
}

export type PlayerImmersiveBoundPortalUser = NonNullable<
	MinecraftAccountForm['boundPortalUser']
>

export type PlayerImmersiveLastLogin = MinecraftLastLoginSummary

export type PlayerImmersiveRegistration = MinecraftRegistrationSummary
