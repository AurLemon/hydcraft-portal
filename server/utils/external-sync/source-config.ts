import type {
	AuthMeSourceConfig,
	LuckPermsSourceConfig,
} from '~/generated/prisma/client'
import { decryptConfigValue } from '../security/encryption'
import { createExternalMysqlPool } from './mysql'

interface MysqlSourceConfig {
	host: string
	port: number
	database: string
	username: string
	encryptedPassword: string | null
}

export const createMysqlPoolFromSourceConfig = (config: MysqlSourceConfig) => {
	const password = decryptConfigValue(config.encryptedPassword) ?? ''
	const url = new URL(`mysql://${config.host}:${config.port}`)
	url.username = config.username
	url.password = password
	url.pathname = `/${config.database}`

	return createExternalMysqlPool(url.toString())
}

export type EnabledAuthMeSourceConfig = AuthMeSourceConfig & {
	minecraftServer: {
		serverId: string
	}
}

export type EnabledLuckPermsSourceConfig = LuckPermsSourceConfig & {
	minecraftServer: {
		serverId: string
	}
}
