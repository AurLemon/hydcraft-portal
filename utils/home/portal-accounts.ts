export interface HomePortalAccountSummary {
	username: string
	avatarUrl: string | null
}

export interface HomePortalAccountsResponse {
	accounts: HomePortalAccountSummary[]
}
