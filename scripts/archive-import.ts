import 'dotenv/config'
import { importArchiveArtifact } from '../server/utils/minecraft/archive-import'

const readArg = (flag: string): string | null => {
	const index = process.argv.indexOf(flag)
	if (index < 0) {
		return null
	}
	return process.argv[index + 1] ?? null
}

const serverId = readArg('--server')
const artifactPath = readArg('--artifact')

if (!serverId || !artifactPath) {
	throw new Error(
		'Usage: pnpm archive:import --server <serverId> --artifact <path>',
	)
}

const result = await importArchiveArtifact({
	serverId,
	artifactPath,
})

console.log(
	[
		`Archive imported for ${result.serverId}`,
		`run=${result.runId}`,
		`players=${result.playersObserved}`,
		`updated=${result.playersUpdated}`,
		`authmeMatched=${result.accountsMatched}`,
		`historicalCreated=${result.historicalAccountsCreated}`,
	].join(' | '),
)
