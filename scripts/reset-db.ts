import { spawnSync } from 'node:child_process'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const runStep = (label: string, args: string[]): void => {
	console.log(`\n[db:dev-reset] ${label}`)

	const result = spawnSync(pnpmCommand, args, {
		stdio: 'inherit',
		shell: false,
	})

	if (result.status !== 0) {
		process.exit(result.status ?? 1)
	}
}

runStep('Reset database', ['exec', 'prisma', 'db', 'push', '--force-reset'])
runStep('Run seed', ['prisma:seed'])

console.log('\n[db:dev-reset] Completed')
