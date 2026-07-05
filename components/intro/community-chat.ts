export type IntroCommunityChatRoleTone = 'info' | 'help' | 'warning' | 'admin'

export interface IntroCommunityChatMessage {
	memberId: string
	displayName: string
	roleTone?: IntroCommunityChatRoleTone
	text: string
}

export interface IntroCommunityChatCardData {
	title?: string
	messages: IntroCommunityChatMessage[]
}
