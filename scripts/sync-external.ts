import 'dotenv/config'
import { consola } from 'consola'
import {
	syncAuthMeSources,
	syncLuckPermsSources,
} from '../server/utils/external-sync/orchestrator'

type SyncTarget = 'authme' | 'luckperms' | 'all'

const target = (process.argv[2] ?? 'all') as SyncTarget
const logger = consola.withTag('sync-script')

if (!['authme', 'luckperms', 'all'].includes(target)) {
	throw new Error(
		'Usage: pnpm sync:external | pnpm sync:authme | pnpm sync:luckperms',
	)
}

if (target === 'authme' || target === 'all') {
	const result = await syncAuthMeSources('SCRIPT')
	logger.success(
		`AuthMe synced: read=${result.rowsRead} matched=${result.rowsMatched} changed=${result.rowsChanged} skipped=${result.rowsSkipped} across ${result.serversRead} servers`,
	)
}

if (target === 'luckperms' || target === 'all') {
	const result = await syncLuckPermsSources('SCRIPT')
	logger.success(
		`LuckPerms synced: read=${result.rowsRead} matched=${result.rowsMatched} changed=${result.rowsChanged} skipped=${result.rowsSkipped} across ${result.serversRead} servers`,
	)
}
