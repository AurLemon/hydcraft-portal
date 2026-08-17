export interface HomePlayerLocationPosition {
	x: number
	y: number
	z: number
}

export interface HomePlayerLocationItem {
	playerId: string
	serverId: string
	position: HomePlayerLocationPosition | null
}

export interface HomePlayerLocationsResponse {
	scene: HomePlayerLocationItem[]
	overview?: HomePlayerLocationItem[]
}
