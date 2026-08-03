export const TURNSTILE_ACTIONS = {
	LOGIN: 'login',
	EMAIL_CODE: 'email-code',
	EMAIL_VERIFICATION: 'email-verification',
	MINECRAFT_LOGIN: 'minecraft-login',
	MINECRAFT_REGISTER: 'minecraft-register',
	PASSWORD_RESET: 'password-reset',
	ACCOUNT_PASSWORD_RESET: 'account-password-reset',
	ACCOUNT_EMAIL_VERIFICATION: 'account-email-verification',
	MINECRAFT_BIND: 'minecraft-bind',
	MINECRAFT_UNBIND: 'minecraft-unbind',
	FRIEND_LINK_APPLICATION: 'friend-link-application',
	DIRECTORY_SEARCH: 'directory-search',
} as const

export type TurnstileAction =
	(typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS]
