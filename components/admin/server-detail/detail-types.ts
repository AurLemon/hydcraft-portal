import type {
	ExternalSyncTaskStateSummary,
	MinecraftServerOverviewResponse,
	MinecraftServerSnapshotSummary,
	MinecraftServerSummary,
	MysqlSourceSummary,
	PortalBridgeCommandSummary,
	PortalBridgeReceiptSummary,
} from '~/components/admin/types'

export interface ServerDetailMetaItem {
	label: string
	value: string
}

export interface ServerDetailSelectedItem {
	type: string
	title: string
	meta: ServerDetailMetaItem[]
	json: string
}

export interface ServerDetailSyncTaskRow {
	source: string
	label: string
	icon: string
	iconClass: string
	statusText: string
	lastText: string
}

export interface ServerDetailFormatter {
	(value: string | null | undefined): string
}

export interface ServerDetailJsonFormatter {
	(value: unknown): string
}

export type ServerDetailOverview = MinecraftServerOverviewResponse | null
export type ServerDetailServer = MinecraftServerSummary | null
export type ServerDetailMysqlSource = MysqlSourceSummary | null
export type ServerDetailSnapshot = MinecraftServerSnapshotSummary
export type ServerDetailReceipt = PortalBridgeReceiptSummary
export type ServerDetailCommand = PortalBridgeCommandSummary
export type ServerDetailSyncTask = ExternalSyncTaskStateSummary
