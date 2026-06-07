import 'dotenv/config'
import { syncAuthMeSnapshots } from '../server/utils/external-sync/authme'
import { syncLuckPermsSnapshots } from '../server/utils/external-sync/luckperms'

type SyncTarget = 'authme' | 'luckperms' | 'all'

const target = (process.argv[2] ?? 'all') as SyncTarget

if (!['authme', 'luckperms', 'all'].includes(target)) {
	throw new Error(
		'Usage: pnpm sync:external | pnpm sync:authme | pnpm sync:luckperms',
	)
}

if (target === 'authme' || target === 'all') {
	const result = await syncAuthMeSnapshots()
	console.log(`AuthMe synced: ${result.rowsUpserted}/${result.rowsRead}`)
}

if (target === 'luckperms' || target === 'all') {
	const result = await syncLuckPermsSnapshots()
	console.log(`LuckPerms synced: ${result.rowsUpserted}/${result.rowsRead}`)
}
