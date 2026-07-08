export interface ArchiveScanServerInput {
	serverId: string
	name: string
	kind: 'MAIN' | 'ARCHIVE' | 'EVENT' | 'TEST'
	status: 'PLANNED' | 'LIVE' | 'FROZEN' | 'ARCHIVED' | 'HIDDEN'
	version: string | null
}

export interface ArchiveScannedLocation {
	worldName: string | null
	dimension: string | null
	x: number | null
	y: number | null
	z: number | null
	yaw: number | null
	pitch: number | null
	observedAt: string | null
}

export interface ArchiveScannedPlayer {
	uuid: string
	playerDataFile: string | null
	lastModifiedAt: string | null
	hasStatsFile: boolean
	hasAdvancementsFile: boolean
	lastKnownName: string | null
	normalizedLastKnownName: string | null
	firstPlayedAt: string | null
	lastPlayedAt: string | null
	location: ArchiveScannedLocation | null
	stats: Record<string, unknown> | null
	statsHash: string | null
	advancements: Record<string, unknown> | null
	advancementsHash: string | null
}

export interface ArchiveScanArtifact {
	artifactVersion: '1'
	scannedAt: string
	scanner: {
		name: string
		version: string
	}
	server: ArchiveScanServerInput
	source: {
		inputPath: string
		worldPath: string
		layout: 'root' | 'world'
	}
	level: {
		levelName: string | null
		dataVersion: number | null
		minecraftVersion: string | null
		lastPlayedAt: string | null
	}
	roster: {
		playerCount: number
		statsCount: number
		advancementsCount: number
	}
	players: ArchiveScannedPlayer[]
	warnings: string[]
}
